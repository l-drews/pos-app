<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw } from "lucide-vue-next";

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
  <section class="container mx-auto p-4">
    <Dialog :open="inputForm" @update:open="inputForm = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ selected ? $t("groups.edit") : $t("groups.add") }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="group-name">{{ $t("common.name") }}</Label>
            <Input id="group-name" v-model="editName" :placeholder="$t('groups.placeholder')" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="inputForm = false">{{ $t("common.cancel") }}</Button>
          <Button @click="saveGroup()">{{ $t("common.save") }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog v-model:active="confirmDialog" @on-confirm="deleteItem" />

    <div class="flex justify-between items-center pb-4">
      <Button @click.stop="showAddDialog()">{{ $t("groups.add") }}</Button>
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t("groups.name") }}</TableHead>
            <TableHead class="w-20 text-right">{{ $t("common.actions") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="2" class="text-center">{{ $t("common.loading") }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!groups?.length">
            <TableCell colspan="2" class="text-center">{{ $t("groups.none") }}</TableCell>
          </TableRow>
          <TableRow v-for="group in groups" :key="group.uuid">
            <TableCell>{{ group.name }}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" @click.stop="showEditDialog(group)">
                <Pencil class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" @click.stop="showConfirmDialog(group)">
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
