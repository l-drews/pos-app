<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { RefreshCw } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const PAGE_SIZE = 50;
const page = ref(0);
const sortBy = ref<"createdAt" | "amount">("createdAt");
const sortDir = ref<"asc" | "desc">("desc");

const { data, isLoading } = useQuery(
  orpc.orders.list.queryOptions({
    input: () => ({
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
      sortBy: sortBy.value,
      sortDir: sortDir.value,
    }),
    // Keep the previous page's rows visible while the next page loads.
    placeholderData: (previousData) => previousData,
  }),
);

const orders = computed(() => data.value?.rows ?? []);
const total = computed(() => data.value?.total ?? 0);

function toggleSort(column: "createdAt" | "amount") {
  if (sortBy.value === column) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = column;
    sortDir.value = "desc";
  }
  page.value = 0;
}

const selectedOrder = ref<any>(null);
const detailOpen = ref(false);

function openOrder(order: any) {
  selectedOrder.value = order;
  detailOpen.value = true;
}

function refresh() {
  queryCache.invalidateQueries({ key: orpc.orders.key() });
}
</script>

<template>
  <section class="container mx-auto p-4">
    <OrderDetailDialog v-model:active="detailOpen" :order="selectedOrder" />

    <div class="flex justify-end items-center pb-4">
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t("common.user") }}</TableHead>
            <TableHead>{{ $t("common.items") }}</TableHead>
            <SortableHead column="amount" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.amount") }}
            </SortableHead>
            <SortableHead column="createdAt" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.date") }}
            </SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading && !orders.length">
            <TableCell colspan="4" class="text-center">{{ $t("common.loading") }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!orders?.length">
            <TableCell colspan="4" class="text-center">{{ $t("orders.none") }}</TableCell>
          </TableRow>
          <TableRow
            v-for="order in orders"
            :key="(order as any).uuid"
            class="cursor-pointer"
            @click="openOrder(order)"
          >
            <TableCell>{{ (order as any).user?.firstName }} {{ (order as any).user?.lastName }}</TableCell>
            <TableCell>{{ (order as any).items?.length ?? 0 }}</TableCell>
            <TableCell>{{ formatCents((order as any).amount ?? 0) }}</TableCell>
            <TableCell>{{ formatDateTime((order as any).createdAt) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination v-model:page="page" :page-size="PAGE_SIZE" :total="total" />
    </div>
  </section>
</template>
