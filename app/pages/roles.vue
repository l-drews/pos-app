<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: roles, isLoading } = useQuery(orpc.roles.getAll.queryOptions());

const createMutation = useMutation({
  ...orpc.roles.create.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.roles.key() }),
});

const updateMutation = useMutation({
  ...orpc.roles.update.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.roles.key() }),
});

const deleteMutation = useMutation({
  ...orpc.roles.delete.mutationOptions(),
  onSettled: () => {
    queryCache.invalidateQueries({ key: orpc.roles.key() });
    deleteError.value = null;
  },
  onError: (err: any) => {
    if (err?.status === 409 || err?.code === "CONFLICT") {
      deleteError.value = "Cannot delete: role is in use.";
    }
  },
});

const selected = ref<any>(null);
const inputForm = ref(false);
const confirmDialog = ref(false);
const deleteError = ref<string | null>(null);

function showForm(role: any | null) {
  selected.value = role;
  inputForm.value = true;
}

function showConfirmDialog(role: any) {
  selected.value = role;
  confirmDialog.value = true;
}

function addOrUpdateItem(role: any) {
  if (role.uuid) {
    updateMutation.mutate(role);
  } else {
    createMutation.mutate(role);
  }
}

function deleteItem() {
  if (selected.value) {
    deleteMutation.mutate({ uuid: selected.value.uuid });
  }
}

function refresh() {
  queryCache.invalidateQueries({ key: orpc.roles.key() });
}
</script>

<template>
  <section class="container mx-auto p-4 bg-white rounded">
    <RoleForm
      v-model:active="inputForm"
      title="Add role"
      :selected="selected"
      @on-confirm="addOrUpdateItem"
    />
    <ConfirmDialog v-model:active="confirmDialog" @on-confirm="deleteItem" />

    <div v-if="deleteError" class="mb-4 p-2 bg-red-100 text-red-700 rounded">
      {{ deleteError }}
    </div>

    <div class="flex justify-between items-center pb-4">
      <o-button @click.stop="showForm(null)">Add role</o-button>
      <o-button icon-right="refresh" @click="refresh()" />
    </div>

    <o-table :data="roles ?? []" :loading="isLoading">
      <template #empty>
        <div class="m-4 text-center">No roles found</div>
      </template>
      <o-table-column v-slot="props" field="name" label="Name" sortable>
        {{ props.row.name }}
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
