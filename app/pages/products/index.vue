<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: products, isLoading } = useQuery(orpc.products.getAll.queryOptions());

const createMutation = useToastMutation({
  ...orpc.products.create.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.products.key() }),
});

const updateMutation = useToastMutation({
  ...orpc.products.update.mutationOptions(),
  onSettled: () => queryCache.invalidateQueries({ key: orpc.products.key() }),
});

const deleteMutation = useToastMutation({
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
  <section class="container mx-auto p-4">
    <ProductForm
      v-model:active="inputForm"
      :title="$t('products.add')"
      :selected="selected"
      @on-confirm="addOrUpdateItem"
    />
    <ConfirmDialog
      v-model:active="confirmDialog"
      @on-confirm="deleteItem"
    />

    <div class="flex justify-between items-center pb-4">
      <Button @click.stop="showForm(null)">{{ $t("products.add") }}</Button>
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t("common.name") }}</TableHead>
            <TableHead>{{ $t("common.barcode") }}</TableHead>
            <TableHead>{{ $t("common.price") }}</TableHead>
            <TableHead class="w-20 text-right">{{ $t("common.actions") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="4" class="text-center">{{ $t("common.loading") }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!products?.length">
            <TableCell colspan="4" class="text-center">{{ $t("products.none") }}</TableCell>
          </TableRow>
          <TableRow
            v-for="product in products"
            :key="product.uuid"
            class="cursor-pointer"
            @click="navigateTo(`/products/${product.uuid}`)"
          >
            <TableCell>{{ product.name }}</TableCell>
            <TableCell>{{ product.barcode }}</TableCell>
            <TableCell>{{ formatCents(product.price) }}</TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="icon" @click.stop="showForm(product)">
                <Pencil class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" @click.stop="showConfirmDialog(product)">
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
