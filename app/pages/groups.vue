<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: groups, isLoading } = useQuery(orpc.groups.getAll.queryOptions());

const createMutation = useMutation({
  ...orpc.groups.create.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.groups.key() }),
});

const updateMutation = useMutation({
  ...orpc.groups.update.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.groups.key() }),
});

const deleteMutation = useMutation({
  ...orpc.groups.delete.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.groups.key() }),
});

const selected = ref<any>(null);
const inputForm = ref(false);
const confirmDialog = ref(false);
const editName = ref("");

function showEditDialog(group: any) {
  selected.value = group;
  editName.value = group.name;
  inputForm.value = true;
}

function showAddDialog() {
  selected.value = null;
  editName.value = "";
  inputForm.value = true;
}

function showConfirmDialog(group: any) {
  selected.value = group;
  confirmDialog.value = true;
}

function saveGroup() {
  inputForm.value = false;
  if (selected.value) {
    updateMutation.mutate({ uuid: selected.value.uuid, name: editName.value });
  } else {
    createMutation.mutate({ name: editName.value });
  }
}

function deleteItem() {
  if (selected.value) {
    deleteMutation.mutate({ uuid: selected.value.uuid });
  }
}

function refresh() {
  queryCache.invalidateQueries({ key: orpc.groups.key() });
}
</script>

<template>
  <section class="container mx-auto p-4 bg-white rounded">
    <o-modal v-model:active="inputForm" scroll="clip" :can-cancel="false">
      <div class="p-4">
        <div class="pb-4">
          <h5>{{ selected ? "Edit group" : "Add group" }}</h5>
        </div>
        <div class="pb-4">
          <o-field grouped label="Name">
            <o-input v-model="editName" placeholder="Group name" expanded />
          </o-field>
        </div>
        <div class="flex flex-row justify-end gap-x-2">
          <o-button @click="inputForm = false">Cancel</o-button>
          <o-button @click="saveGroup()">Save</o-button>
        </div>
      </div>
    </o-modal>
    <ConfirmDialog v-model:active="confirmDialog" @on-confirm="deleteItem" />

    <div class="flex justify-between items-center pb-4">
      <o-button @click.stop="showAddDialog()">Add group</o-button>
      <o-button icon-right="refresh" @click="refresh()" />
    </div>

    <o-table :data="groups ?? []" :loading="isLoading">
      <template #empty>
        <div class="m-4 text-center">No groups found</div>
      </template>
      <o-table-column v-slot="props" field="name" label="Group Name" sortable>
        {{ props.row.name }}
      </o-table-column>
      <o-table-column v-slot="props" width="80">
        <div class="float-right">
          <o-icon clickable class="w-6 h-6" icon="pencil" @click.stop="showEditDialog(props.row)" />
          <o-icon clickable class="w-6 h-6" icon="delete" @click.stop="showConfirmDialog(props.row)" />
        </div>
      </o-table-column>
    </o-table>
  </section>
</template>
