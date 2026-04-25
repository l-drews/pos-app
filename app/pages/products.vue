<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: products, isLoading } = useQuery(orpc.products.getAll.queryOptions());

const createMutation = useMutation({
  ...orpc.products.create.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.products.key() }),
});

const updateMutation = useMutation({
  ...orpc.products.update.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.products.key() }),
});

const deleteMutation = useMutation({
  ...orpc.products.delete.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.products.key() }),
});

const selected = ref<any>(null);
const inputForm = ref(false);
const confirmDialog = ref(false);

function showForm(product: any | null) {
  selected.value = product;
  inputForm.value = true;
}

function showConfirmDialog(product: any) {
  selected.value = product;
  confirmDialog.value = true;
}

function addOrUpdateItem(product: any) {
  if (product.uuid) {
    updateMutation.mutate(product);
  } else {
    createMutation.mutate(product);
  }
}

function deleteItem() {
  if (selected.value) {
    deleteMutation.mutate({ uuid: selected.value.uuid });
  }
}

function refresh() {
  queryCache.invalidateQueries({ key: orpc.products.key() });
}
</script>

<template>
  <section class="container mx-auto p-4 bg-white rounded">
    <ProductForm
      v-model:active="inputForm"
      title="Add product"
      :selected="selected"
      @on-confirm="addOrUpdateItem"
    />
    <ConfirmDialog
      v-model:active="confirmDialog"
      @on-confirm="deleteItem"
    />

    <div class="flex justify-between items-center pb-4">
      <o-button @click.stop="showForm(null)">Add product</o-button>
      <o-button icon-right="refresh" @click="refresh()" />
    </div>

    <o-table :data="products ?? []" :loading="isLoading">
      <template #empty>
        <div class="m-4 text-center">No products found</div>
      </template>
      <o-table-column v-slot="props" field="name" label="Name" sortable>
        {{ props.row.name }}
      </o-table-column>
      <o-table-column v-slot="props" field="barcode" label="Barcode" sortable>
        {{ props.row.barcode }}
      </o-table-column>
      <o-table-column v-slot="props" field="price" label="Price" sortable>
        {{ formatCents(props.row.price) }}
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
