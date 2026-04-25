<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";

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
  <section class="container mx-auto p-4 bg-white rounded">
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
      <o-button @click.stop="showForm(null)">Add user</o-button>
      <div class="flex gap-2">
        <o-button @click="downloadBarcodes">Export</o-button>
        <o-upload v-model="importFile" accept=".csv">
          <o-button tag="a" :icon-left="importFile ? '' : 'plus'">
            {{ importFile?.name || "import" }}
          </o-button>
        </o-upload>
        <o-button v-if="importFile" @click="importUsers">Apply</o-button>
        <o-button icon-right="refresh" @click="refresh()" />
      </div>
    </div>

    <o-table :data="users ?? []" :loading="isLoading" paginated per-page="15">
      <template #empty>
        <div class="m-4 text-center">No users found</div>
      </template>
      <o-table-column v-slot="props" width="56">
        <img
          class="w-8 aspect-square rounded-full border border-inherit"
          :src="props.row.imageUrl ?? defaultImageUrl"
        />
      </o-table-column>
      <o-table-column v-slot="props" field="firstName" label="First Name" sortable>
        {{ props.row.firstName }}
      </o-table-column>
      <o-table-column v-slot="props" field="lastName" label="Last Name" sortable>
        {{ props.row.lastName }}
      </o-table-column>
      <o-table-column v-slot="props" field="group" label="Group" sortable>
        {{ props.row.group?.name }}
      </o-table-column>
      <o-table-column v-slot="props" field="birthDate" label="Date" sortable>
        {{ props.row.birthDate }}
      </o-table-column>
      <o-table-column v-slot="props" field="balance" label="Balance" sortable>
        {{ formatCents(props.row.balance ?? 0) }}
      </o-table-column>
      <o-table-column v-slot="props" field="barcode" label="Barcode" sortable>
        {{ props.row.barcode }}
      </o-table-column>
      <o-table-column v-slot="props" width="80">
        <div class="float-right">
          <o-icon clickable class="w-6 h-6" icon="pencil" @click.stop="showForm(props.row)" />
          <o-icon clickable class="w-6 h-6" icon="delete" @click.stop="showConfirmDialog(props.row)" />
        </div>
      </o-table-column>
    </o-table>
  </section>
</template>

<style scoped>
:deep() .o-table__td {
  vertical-align: middle;
}
</style>
