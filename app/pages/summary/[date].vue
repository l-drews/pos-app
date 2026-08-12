<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { ArrowLeft, Download } from "lucide-vue-next";

const route = useRoute();
const orpc = useOrpc();

// Route param is a local-timezone "YYYY-MM-DD" day key from the summary page.
const day = computed(() => parseLocalISODate(String(route.params.date)));

const range = computed(() => {
  const from = day.value ?? new Date(0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.getTime(), to: to.getTime() };
});

const { data: orders, isLoading } = useQuery(
  orpc.orders.getByRange.queryOptions({
    input: () => range.value,
    enabled: () => day.value !== null,
  }),
);

const stats = computed(() => {
  const list = (orders.value ?? []) as any[];
  const total = list.reduce((sum, o) => sum + (o.amount ?? 0), 0);
  return {
    orderCount: list.length,
    total,
    average: list.length ? Math.round(total / list.length) : 0,
  };
});

// Hourly bins from the first to the last order of the day, zero-filled in
// between, feeding the two time charts (revenue and order count share bins).
const hourlyBuckets = computed(() => {
  const list = (orders.value ?? []) as any[];
  if (!list.length) return [];
  const hours = list.map((o) => new Date(o.createdAt).getHours());
  const first = Math.min(...hours);
  const last = Math.max(...hours);
  const bins = Array.from({ length: last - first + 1 }, (_, i) => ({
    label: `${String(first + i).padStart(2, "0")}:00`,
    amount: 0,
    count: 0,
  }));
  for (const order of list) {
    const bin = bins[new Date(order.createdAt).getHours() - first]!;
    bin.amount += order.amount ?? 0;
    bin.count += 1;
  }
  return bins;
});

const revenueBuckets = computed(() =>
  hourlyBuckets.value.map((b) => ({ label: b.label, value: b.amount })),
);
const countBuckets = computed(() =>
  hourlyBuckets.value.map((b) => ({ label: b.label, value: b.count })),
);

interface TopProduct {
  uuid: string;
  name: string;
  quantity: number;
  revenue: number;
}

// Every product sold that day with quantity and revenue, best-selling first —
// the top-products table shows the head, the CSV export takes all of it.
const productSales = computed<TopProduct[]>(() => {
  const byProduct = new Map<string, TopProduct>();
  for (const order of (orders.value ?? []) as any[]) {
    for (const item of order.items ?? []) {
      const uuid = item.productUuid ?? item.product?.uuid ?? "unknown";
      const entry = byProduct.get(uuid) ?? {
        uuid,
        name: item.product?.name ?? "—",
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += item.count ?? 0;
      entry.revenue += item.amount ?? 0;
      byProduct.set(uuid, entry);
    }
  }
  return [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
});

const topProducts = computed<TopProduct[]>(() => productSales.value.slice(0, 5));

// Same CSV conventions as the users export: ";" separator, decimal-comma
// amounts, ";" stripped from free-text fields.
function exportSales() {
  const field = (value: string) => value.replace(/;/g, ",");
  const euros = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  const lines = ["product;quantity;revenue"];
  for (const product of productSales.value) {
    lines.push([field(product.name), product.quantity, euros(product.revenue)].join(";"));
  }
  downloadCsv(`sales-${route.params.date}.csv`, lines.join("\n"));
}

interface TopUser {
  uuid: string;
  name: string;
  orderCount: number;
  spent: number;
}

const topUsers = computed<TopUser[]>(() => {
  const byUser = new Map<string, TopUser>();
  for (const order of (orders.value ?? []) as any[]) {
    const uuid = order.userUuid ?? order.user?.uuid ?? "unknown";
    const entry = byUser.get(uuid) ?? {
      uuid,
      name: order.user
        ? `${order.user.firstName} ${order.user.lastName}`
        : "—",
      orderCount: 0,
      spent: 0,
    };
    entry.orderCount += 1;
    entry.spent += order.amount ?? 0;
    byUser.set(uuid, entry);
  }
  return [...byUser.values()]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
});

const selectedOrder = ref<any>(null);
const detailOpen = ref(false);

function openOrder(order: any) {
  selectedOrder.value = order;
  detailOpen.value = true;
}

function openUser(user: TopUser) {
  // "unknown" is the aggregation fallback for orders without a user row.
  if (user.uuid !== "unknown") navigateTo(`/users/${user.uuid}`);
}

function openProduct(product: TopProduct) {
  if (product.uuid !== "unknown") navigateTo(`/products/${product.uuid}`);
}
</script>

<template>
  <section class="container mx-auto p-4 space-y-4">
    <OrderDetailDialog v-model:active="detailOpen" :order="selectedOrder" />

    <div class="flex items-center justify-between">
      <Button variant="ghost" size="sm" @click="navigateTo('/summary')">
        <ArrowLeft class="mr-2 size-4" />
        {{ $t("common.back") }}
      </Button>
      <div class="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          :disabled="!productSales.length"
          @click="exportSales"
        >
          <Download class="mr-2 size-4" />
          {{ $t("common.export") }}
        </Button>
        <h1 class="text-xl font-semibold">
          {{ day ? formatDate(day) : $t("summary.unknownDay") }}
        </h1>
      </div>
    </div>

    <div v-if="!day" class="py-12 text-center text-muted-foreground">
      {{ $t("summary.invalidDate") }}
    </div>
    <div v-else-if="isLoading" class="py-12 text-center text-muted-foreground">
      {{ $t("common.loading") }}
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("common.orders") }}</p>
          <p class="text-2xl font-bold">{{ stats.orderCount }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("summary.averageOrder") }}</p>
          <p class="text-2xl font-bold">{{ formatCents(stats.average) }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("summary.totalRevenue") }}</p>
          <p class="text-2xl font-bold">{{ formatCents(stats.total) }}</p>
        </div>
      </div>

      <div v-if="hourlyBuckets.length" class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border bg-card p-4">
          <h2 class="pb-3 text-lg font-medium">{{ $t("summary.revenueOverDay") }}</h2>
          <HourlyBarChart :buckets="revenueBuckets" :format="formatCents" />
        </div>
        <div class="rounded-lg border bg-card p-4">
          <h2 class="pb-3 text-lg font-medium">{{ $t("summary.ordersOverDay") }}</h2>
          <HourlyBarChart :buckets="countBuckets" :format="(v: number) => String(v)" />
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border bg-card p-4">
          <h2 class="pb-3 text-lg font-medium">{{ $t("summary.topProducts") }}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ $t("orders.product") }}</TableHead>
                <TableHead class="text-right">{{ $t("orders.qty") }}</TableHead>
                <TableHead class="text-right">{{ $t("products.revenue") }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!topProducts.length">
                <TableCell colspan="3" class="text-center">{{ $t("summary.noSales") }}</TableCell>
              </TableRow>
              <TableRow
                v-for="product in topProducts"
                :key="product.uuid"
                :class="product.uuid !== 'unknown' ? 'cursor-pointer' : ''"
                @click="openProduct(product)"
              >
                <TableCell>{{ product.name }}</TableCell>
                <TableCell class="text-right">{{ product.quantity }}</TableCell>
                <TableCell class="text-right">{{ formatCents(product.revenue) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="rounded-lg border bg-card p-4">
          <h2 class="pb-3 text-lg font-medium">{{ $t("summary.topCustomers") }}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ $t("common.user") }}</TableHead>
                <TableHead class="text-right">{{ $t("common.orders") }}</TableHead>
                <TableHead class="text-right">{{ $t("summary.spent") }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!topUsers.length">
                <TableCell colspan="3" class="text-center">{{ $t("summary.noCustomers") }}</TableCell>
              </TableRow>
              <TableRow
                v-for="user in topUsers"
                :key="user.uuid"
                :class="user.uuid !== 'unknown' ? 'cursor-pointer' : ''"
                @click="openUser(user)"
              >
                <TableCell>{{ user.name }}</TableCell>
                <TableCell class="text-right">{{ user.orderCount }}</TableCell>
                <TableCell class="text-right">{{ formatCents(user.spent) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div class="rounded-lg border bg-card p-4">
        <h2 class="pb-3 text-lg font-medium">{{ $t("common.orders") }}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t("common.time") }}</TableHead>
              <TableHead>{{ $t("common.user") }}</TableHead>
              <TableHead class="text-right">{{ $t("common.items") }}</TableHead>
              <TableHead class="text-right">{{ $t("common.amount") }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!(orders as any[])?.length">
              <TableCell colspan="4" class="text-center">{{ $t("orders.noOrdersDay") }}</TableCell>
            </TableRow>
            <TableRow
              v-for="order in orders as any[]"
              :key="order.uuid"
              class="cursor-pointer"
              @click="openOrder(order)"
            >
              <TableCell>{{ formatDateTime(order.createdAt) }}</TableCell>
              <TableCell>{{ order.user?.firstName }} {{ order.user?.lastName }}</TableCell>
              <TableCell class="text-right">{{ order.items?.length ?? 0 }}</TableCell>
              <TableCell class="text-right">{{ formatCents(order.amount ?? 0) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </section>
</template>
