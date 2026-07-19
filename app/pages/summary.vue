<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { RefreshCw } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: orders, isLoading } = useQuery(orpc.orders.getAll.queryOptions());

interface DailySummary {
  date: Date;
  orderCount: number;
  total: number;
  average: number;
}

const dailySummaries = computed<DailySummary[]>(() => {
  if (!orders.value) return [];

  const byDay = new Map<string, { date: Date; orderCount: number; total: number }>();
  for (const order of orders.value as any[]) {
    const createdAt = new Date(order.createdAt);
    const key = createdAt.toDateString();
    const entry = byDay.get(key) ?? { date: createdAt, orderCount: 0, total: 0 };
    entry.orderCount += 1;
    entry.total += order.amount ?? 0;
    byDay.set(key, entry);
  }

  return [...byDay.values()]
    .map((d) => ({
      ...d,
      average: d.orderCount ? Math.round(d.total / d.orderCount) : 0,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
});

function refresh() {
  queryCache.invalidateQueries({ key: orpc.orders.key() });
}
</script>

<template>
  <section class="container mx-auto p-4">
    <div class="flex justify-between items-center pb-4">
      <h1 class="text-xl font-semibold">Daily summary</h1>
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Average order</TableHead>
            <TableHead>Total revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="4" class="text-center">Loading...</TableCell>
          </TableRow>
          <TableRow v-else-if="!dailySummaries.length">
            <TableCell colspan="4" class="text-center">No orders found</TableCell>
          </TableRow>
          <TableRow v-for="day in dailySummaries" :key="day.date.toDateString()">
            <TableCell>{{ formatDate(day.date) }}</TableCell>
            <TableCell>{{ day.orderCount }}</TableCell>
            <TableCell>{{ formatCents(day.average) }}</TableCell>
            <TableCell class="font-medium">{{ formatCents(day.total) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
