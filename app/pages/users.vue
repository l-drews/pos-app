<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw, Upload, Download } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: users, isLoading } = useQuery(orpc.users.getAll.queryOptions());

const createMutation = useMutation({
  ...orpc.users.create.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const updateMutation = useMutation({
  ...orpc.users.update.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const deleteMutation = useMutation({
  ...orpc.users.delete.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.users.key() }),
});

const importCsvMutation = useMutation({
  ...orpc.users.importCsv.mutationOptions(),
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

function onImportFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) importFile.value = files[0];
}

async function importUsers() {
  if (importFile.value) {
    const text = await importFile.value.text();
    importCsvMutation.mutate({ csvContent: text });
    importFile.value = null;
  }
}

function downloadBarcodes() {
  if (!users.value) return;
  const headers = ["barcode", "firstName", "lastName", "balance"];
  let data = headers.join(",") + "\n";
  for (const user of users.value) {
    const line = headers.map((h) => (user as any)[h] ?? "");
    data += line.join(",") + "\n";
  }
  const el = document.createElement("a");
  el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(data));
  el.setAttribute("download", "barcodes.csv");
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

const defaultImageUrl = "/images/default-avatar.png";
</script>

<template>
  <section class="container mx-auto p-4">
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

    <div class="flex justify-between items-center pb-4">
      <Button @click.stop="showForm(null)">Add user</Button>
      <div class="flex gap-2">
        <Button variant="outline" @click="downloadBarcodes">
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
          <TableRow v-for="user in users" :key="user.uuid">
            <TableCell>
              <img
                class="w-8 h-8 rounded-full border object-cover"
                :src="(user as any).imageUrl ?? defaultImageUrl"
              />
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
