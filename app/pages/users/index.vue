<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw, Upload, Download, Search } from "lucide-vue-next";
import { toast } from "vue-sonner";

const orpc = useOrpc();
const queryCache = useQueryCache();
const { t } = useI18n();

const { data: users, isLoading } = useQuery(orpc.users.getAll.queryOptions());

const createMutation = useToastMutation({
  ...orpc.users.create.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const updateMutation = useToastMutation({
  ...orpc.users.update.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const deleteMutation = useToastMutation({
  ...orpc.users.delete.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const importCsvMutation = useToastMutation({
  ...orpc.users.importCsv.mutationOptions(),
  onSuccess: (result: { imported: number; skipped: number; errors: string[] }) => {
    const { imported, skipped, errors } = result;
    if (skipped > 0 || errors.length > 0) {
      const preview = errors.slice(0, 3).join("\n");
      const more =
        errors.length > 3 ? `\n${t("users.andMore", { n: errors.length - 3 })}` : "";
      toast.warning(t("users.importedSkipped", { imported, skipped }), {
        description: preview + more,
        duration: 8000,
      });
    } else {
      toast.success(t("users.imported", { n: imported }, imported));
    }
  },
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const selected = ref<any>(null);
const inputForm = ref(false);
const confirmDialog = ref(false);
const importFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Client-side search + sort: the page already loads all users, and at POS
// scale filtering in the browser is instant.
const search = ref("");

type SortColumn = "firstName" | "lastName" | "group" | "birthDate" | "balance" | "barcode";
const sortBy = ref<SortColumn>("firstName");
const sortDir = ref<"asc" | "desc">("asc");

function toggleSort(column: string) {
  const col = column as SortColumn;
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = col;
    sortDir.value = "asc";
  }
}

const visibleUsers = computed(() => {
  let result = (users.value ?? []) as any[];

  const query = search.value.trim().toLowerCase();
  if (query) {
    result = result.filter((u) =>
      [u.firstName, u.lastName, u.group?.name, u.barcode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }

  const dir = sortDir.value === "asc" ? 1 : -1;
  const key = sortBy.value;
  return [...result].sort((a, b) => {
    if (key === "balance") return ((a.balance ?? 0) - (b.balance ?? 0)) * dir;
    if (key === "birthDate") {
      return (new Date(a.birthDate).getTime() - new Date(b.birthDate).getTime()) * dir;
    }
    const av = key === "group" ? (a.group?.name ?? "") : (a[key] ?? "");
    const bv = key === "group" ? (b.group?.name ?? "") : (b[key] ?? "");
    return String(av).localeCompare(String(bv), "de", { sensitivity: "base" }) * dir;
  });
});

function showForm(user: any | null) {
  selected.value = user;
  inputForm.value = true;
}

function showConfirmDialog(user: any) {
  selected.value = user;
  confirmDialog.value = true;
}

function addOrUpdateItem(user: any) {
  if (user.uuid) {
    updateMutation.mutate(user);
  } else {
    createMutation.mutate(user);
  }
}

function deleteItem() {
  if (selected.value) {
    deleteMutation.mutate({ uuid: selected.value.uuid });
  }
}

function refresh() {
  queryCache.invalidateQueries({ key: orpc.users.key() });
}

function openUser(uuid: string) {
  navigateTo(`/users/${uuid}`);
}

function onImportFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) importFile.value = files[0] ?? null;
}

async function importUsers() {
  if (importFile.value) {
    // Not file.text(): that always decodes UTF-8 and would turn the umlauts
    // in Excel's Windows-1252 ("ANSI") exports into "�".
    const text = decodeCsvBuffer(await importFile.value.arrayBuffer());
    importCsvMutation.mutate({ csvContent: text });
    importFile.value = null;
  }
}

// Exports users in the exact format the importer expects (the import format is
// the source of truth), so an exported file can be re-imported as-is. The
// importer splits on ";" without quoting, so strip it from field values.
function exportUsers() {
  if (!users.value) return;
  const field = (value: string) => value.replace(/;/g, ",");
  const headers = ["firstname", "lastname", "birthdate", "group", "barcode", "amount"];
  const lines = [headers.join(";")];
  for (const user of users.value as any[]) {
    const birthdate = formatDate(user.birthDate);
    const amount = ((user.balance ?? 0) / 100).toFixed(2).replace(".", ",");
    lines.push(
      [
        field(user.firstName ?? ""),
        field(user.lastName ?? ""),
        birthdate === "-" ? "" : birthdate,
        field(user.group?.name ?? ""),
        field(user.barcode ?? ""),
        amount,
      ].join(";"),
    );
  }
  // The BOM makes Excel detect UTF-8 — without it, Excel assumes ANSI and
  // garbles umlauts. The importer strips it, so exports re-import cleanly.
  const data = "\uFEFF" + lines.join("\n");
  const el = document.createElement("a");
  el.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(data));
  el.setAttribute("download", "users.csv");
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}
</script>

<template>
  <section class="container mx-auto p-4 space-y-4">
    <UserForm
      v-model:active="inputForm"
      :title="selected ? $t('users.editTitle') : $t('users.add')"
      :selected="selected"
      @on-confirm="addOrUpdateItem"
    />
    <ConfirmDialog
      v-model:active="confirmDialog"
      @on-confirm="deleteItem"
    />

    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <Button @click.stop="showForm(null)">{{ $t("users.add") }}</Button>
        <div class="relative">
          <Search
            class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" :placeholder="$t('users.search')" class="w-64 pl-8" />
        </div>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="exportUsers">
          <Download class="mr-2 size-4" />
          {{ $t("common.export") }}
        </Button>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="onImportFileSelect"
        />
        <Button variant="outline" @click="fileInput?.click()">
          <Upload class="mr-2 size-4" />
          {{ importFile?.name || $t("common.import") }}
        </Button>
        <Button v-if="importFile" @click="importUsers">{{ $t("common.apply") }}</Button>
        <Button variant="outline" size="icon" @click="refresh()">
          <RefreshCw class="size-4" />
        </Button>
      </div>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-14" />
            <SortableHead column="firstName" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("users.firstName") }}
            </SortableHead>
            <SortableHead column="lastName" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("users.lastName") }}
            </SortableHead>
            <SortableHead column="group" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.group") }}
            </SortableHead>
            <SortableHead column="birthDate" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("users.dateOfBirth") }}
            </SortableHead>
            <SortableHead column="balance" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.balance") }}
            </SortableHead>
            <SortableHead column="barcode" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.barcode") }}
            </SortableHead>
            <TableHead class="w-20 text-right">{{ $t("common.actions") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="8" class="text-center">{{ $t("common.loading") }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!visibleUsers.length">
            <TableCell colspan="8" class="text-center">
              {{ search ? $t("users.noMatch") : $t("users.none") }}
            </TableCell>
          </TableRow>
          <TableRow
            v-for="user in visibleUsers"
            :key="user.uuid"
            class="cursor-pointer"
            @click="openUser(user.uuid)"
          >
            <TableCell>
              <UserAvatar class="size-8" :src="(user as any).imageUrl" />
            </TableCell>
            <TableCell>{{ user.firstName }}</TableCell>
            <TableCell>{{ user.lastName }}</TableCell>
            <TableCell>{{ (user as any).group?.name }}</TableCell>
            <TableCell>{{ formatDate(user.birthDate) }}</TableCell>
            <TableCell>{{ formatCents((user as any).balance ?? 0) }}</TableCell>
            <TableCell>{{ user.barcode }}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" @click.stop="showForm(user)">
                <Pencil class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" @click.stop="showConfirmDialog(user)">
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
