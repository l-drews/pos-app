<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { Pencil, Trash2, RefreshCw, RotateCcw } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const showDeleted = ref(false);

const { data: products, isLoading } = useQuery(
  orpc.products.getAll.queryOptions({
    input: () => ({ includeDeleted: showDeleted.value }),
  }),
);

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

const restoreMutation = useToastMutation({
  ...orpc.products.restore.mutationOptions(),
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
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Switch id="show-deleted" v-model="showDeleted" />
          <Label for="show-deleted">{{ $t("products.showDeleted") }}</Label>
        </div>
        <Button variant="outline" size="icon" @click="refresh()">
          <RefreshCw class="size-4" />
        </Button>
      </div>
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
            :class="(product as any).deletedAt ? 'opacity-60' : ''"
            @click="navigateTo(`/products/${product.uuid}`)"
          >
            <TableCell>
              {{ product.name }}
              <Badge v-if="(product as any).deletedAt" variant="outline" class="ml-2">
                {{ $t("products.deleted") }}
              </Badge>
            </TableCell>
            <TableCell>{{ product.barcode }}</TableCell>
            <TableCell>{{ formatCents(product.price) }}</TableCell>
            <TableCell class="text-right">
              <Button
                v-if="(product as any).deletedAt"
                variant="ghost"
                size="icon"
                :title="$t('products.restore')"
                @click.stop="restoreMutation.mutate({ uuid: product.uuid })"
              >
                <RotateCcw class="size-4" />
              </Button>
              <template v-else>
                <Button variant="ghost" size="icon" @click.stop="showForm(product)">
                  <Pencil class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" @click.stop="showConfirmDialog(product)">
                  <Trash2 class="size-4" />
                </Button>
              </template>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
