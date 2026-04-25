<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw } from "lucide-vue-next";

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
  <section class="container mx-auto p-4">
    <RoleForm
      v-model:active="inputForm"
      title="Add role"
      :selected="selected"
      @on-confirm="addOrUpdateItem"
    />
    <ConfirmDialog v-model:active="confirmDialog" @on-confirm="deleteItem" />

    <div v-if="deleteError" class="mb-4 p-2 bg-destructive/10 text-destructive rounded">
      {{ deleteError }}
    </div>

    <div class="flex justify-between items-center pb-4">
      <Button @click.stop="showForm(null)">Add role</Button>
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead class="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="2" class="text-center">Loading...</TableCell>
          </TableRow>
          <TableRow v-else-if="!roles?.length">
            <TableCell colspan="2" class="text-center">No roles found</TableCell>
          </TableRow>
          <TableRow v-for="role in roles" :key="role.uuid">
            <TableCell>{{ role.name }}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" @click.stop="showForm(role)">
                <Pencil class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" @click.stop="showConfirmDialog(role)">
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
