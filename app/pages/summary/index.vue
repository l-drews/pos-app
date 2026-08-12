<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { Download, RefreshCw } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: orders, isLoading } = useQuery(orpc.orders.getAll.queryOptions());

interface DailySummary {
  key: string;
  date: Date;
  orderCount: number;
  total: number;
  average: number;
}

const dailySummaries = computed<DailySummary[]>(() => {
  if (!orders.value) return [];

  const byDay = new Map<string, { key: string; date: Date; orderCount: number; total: number }>();
  for (const order of orders.value as any[]) {
    const createdAt = new Date(order.createdAt);
    const key = toLocalISODate(createdAt);
    const entry = byDay.get(key) ?? { key, date: createdAt, orderCount: 0, total: 0 };
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

// One CSV row per day with that day's combined totals — the table above,
// chronological. Same CSV conventions as the other exports: ";" separator,
// decimal-comma amounts.
function exportAllSales() {
  const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const lines = ["date;orders;average;revenue"];
  for (const day of [...dailySummaries.value].reverse()) {
    lines.push(
      [formatDate(day.date), day.orderCount, euros(day.average), euros(day.total)].join(";"),
    );
  }
  downloadCsv("sales.csv", lines.join("\n"));
}
</script>

<template>
  <section class="container mx-auto p-4">
    <div class="flex justify-between items-center pb-4">
      <h1 class="text-xl font-semibold">{{ $t("summary.title") }}</h1>
      <div class="flex gap-2">
        <Button
          variant="outline"
          :disabled="!dailySummaries.length"
          @click="exportAllSales"
        >
          <Download class="mr-2 size-4" />
          {{ $t("common.export") }}
        </Button>
        <Button variant="outline" size="icon" @click="refresh()">
          <RefreshCw class="size-4" />
        </Button>
      </div>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t("common.date") }}</TableHead>
            <TableHead>{{ $t("common.orders") }}</TableHead>
            <TableHead>{{ $t("summary.averageOrder") }}</TableHead>
            <TableHead>{{ $t("summary.totalRevenue") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="4" class="text-center">{{ $t("common.loading") }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!dailySummaries.length">
            <TableCell colspan="4" class="text-center">{{ $t("orders.none") }}</TableCell>
          </TableRow>
          <TableRow
            v-for="day in dailySummaries"
            :key="day.key"
            class="cursor-pointer"
            @click="navigateTo(`/summary/${day.key}`)"
          >
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
