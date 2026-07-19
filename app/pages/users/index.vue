<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw, Upload, Download } from "lucide-vue-next";
import { toast } from "vue-sonner";

const orpc = useOrpc();
const queryCache = useQueryCache();

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
      const more = errors.length > 3 ? `\n…and ${errors.length - 3} more` : "";
      toast.warning(`Imported ${imported}, skipped ${skipped}`, {
        description: preview + more,
        duration: 8000,
      });
    } else {
      toast.success(`Imported ${imported} user${imported === 1 ? "" : "s"}`);
    }
  },
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const selected = ref<any>(null);
const inputForm = ref(false);
const confirmDialog = ref(false);
const importFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

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
    const text = await importFile.value.text();
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
  const data = lines.join("\n");
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
      title="Add user"
      :selected="selected"
      @on-confirm="addOrUpdateItem"
    />
    <ConfirmDialog
      v-model:active="confirmDialog"
      @on-confirm="deleteItem"
    />

    <div class="flex justify-between items-center">
      <Button @click.stop="showForm(null)">Add user</Button>
      <div class="flex gap-2">
        <Button variant="outline" @click="exportUsers">
          <Download class="mr-2 size-4" />
          Export
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
          {{ importFile?.name || "Import" }}
        </Button>
        <Button v-if="importFile" @click="importUsers">Apply</Button>
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
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead class="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="8" class="text-center">Loading...</TableCell>
          </TableRow>
          <TableRow v-else-if="!users?.length">
            <TableCell colspan="8" class="text-center">No users found</TableCell>
          </TableRow>
          <TableRow
            v-for="user in users"
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
