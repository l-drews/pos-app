<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { ArrowLeft, Tag } from "lucide-vue-next";

const route = useRoute();
const orpc = useOrpc();

const uuid = computed(() => String(route.params.uuid));

const { data: product, isLoading } = useQuery(
  orpc.products.getByUuid.queryOptions({ input: () => ({ uuid: uuid.value }) }),
);

const { data: sales } = useQuery(
  orpc.orders.getSalesByProduct.queryOptions({
    input: () => ({ productUuid: uuid.value }),
  }),
);

const stats = computed(() => {
  const items = (sales.value ?? []) as any[];
  return {
    orders: items.length,
    unitsSold: items.reduce((sum, i) => sum + (i.count ?? 0), 0),
    revenue: items.reduce((sum, i) => sum + (i.amount ?? 0), 0),
  };
});

interface DailySales {
  key: string;
  date: Date;
  quantity: number;
  revenue: number;
}

const dailySales = computed<DailySales[]>(() => {
  const byDay = new Map<string, DailySales>();
  for (const item of (sales.value ?? []) as any[]) {
    const createdAt = new Date(item.order?.createdAt ?? item.createdAt);
    const key = toLocalISODate(createdAt);
    const entry = byDay.get(key) ?? { key, date: createdAt, quantity: 0, revenue: 0 };
    entry.quantity += item.count ?? 0;
    entry.revenue += item.amount ?? 0;
    byDay.set(key, entry);
  }
  return [...byDay.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
});
</script>

<template>
  <section class="container mx-auto p-4 space-y-4">
    <div class="flex items-center justify-between">
      <Button variant="ghost" size="sm" @click="navigateTo('/products')">
        <ArrowLeft class="mr-2 size-4" />
        {{ $t("common.back") }}
      </Button>
    </div>

    <div v-if="isLoading" class="py-12 text-center text-muted-foreground">
      {{ $t("common.loading") }}
    </div>
    <div v-else-if="!product" class="py-12 text-center text-muted-foreground">
      {{ $t("products.notFound") }}
    </div>

    <template v-else>
      <div class="flex items-center gap-4 rounded-lg border bg-card p-6">
        <div
          class="inline-flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground"
        >
          <Tag class="size-7" />
        </div>
        <div>
          <h1 class="text-2xl font-semibold">{{ product.name }}</h1>
          <p class="text-sm text-muted-foreground">
            {{ formatCents(product.price) }} · {{ $t("common.barcode") }}:
            {{ product.barcode ?? "—" }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("products.unitsSold") }}</p>
          <p class="text-2xl font-bold">{{ stats.unitsSold }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("common.orders") }}</p>
          <p class="text-2xl font-bold">{{ stats.orders }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("summary.totalRevenue") }}</p>
          <p class="text-2xl font-bold">{{ formatCents(stats.revenue) }}</p>
        </div>
      </div>

      <div class="rounded-lg border bg-card p-4">
        <h2 class="pb-3 text-lg font-medium">{{ $t("products.salesByDay") }}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t("common.date") }}</TableHead>
              <TableHead class="text-right">{{ $t("products.units") }}</TableHead>
              <TableHead class="text-right">{{ $t("products.revenue") }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!dailySales.length">
              <TableCell colspan="3" class="text-center">{{ $t("products.noSales") }}</TableCell>
            </TableRow>
            <TableRow
              v-for="day in dailySales"
              :key="day.key"
              class="cursor-pointer"
              @click="navigateTo(`/summary/${day.key}`)"
            >
              <TableCell>{{ formatDate(day.date) }}</TableCell>
              <TableCell class="text-right">{{ day.quantity }}</TableCell>
              <TableCell class="text-right">{{ formatCents(day.revenue) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </section>
</template>
