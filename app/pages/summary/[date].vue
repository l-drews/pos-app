<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { ArrowLeft } from "lucide-vue-next";

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

interface TopProduct {
  uuid: string;
  name: string;
  quantity: number;
  revenue: number;
}

const topProducts = computed<TopProduct[]>(() => {
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
  return [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
});

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
        Back
      </Button>
      <h1 class="text-xl font-semibold">
        {{ day ? formatDate(day) : "Unknown day" }}
      </h1>
    </div>

    <div v-if="!day" class="py-12 text-center text-muted-foreground">
      Invalid date
    </div>
    <div v-else-if="isLoading" class="py-12 text-center text-muted-foreground">
      Loading...
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">Orders</p>
          <p class="text-2xl font-bold">{{ stats.orderCount }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">Average order</p>
          <p class="text-2xl font-bold">{{ formatCents(stats.average) }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">Total revenue</p>
          <p class="text-2xl font-bold">{{ formatCents(stats.total) }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border bg-card p-4">
          <h2 class="pb-3 text-lg font-medium">Top products</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead class="text-right">Qty</TableHead>
                <TableHead class="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!topProducts.length">
                <TableCell colspan="3" class="text-center">No sales</TableCell>
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
          <h2 class="pb-3 text-lg font-medium">Top customers</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead class="text-right">Orders</TableHead>
                <TableHead class="text-right">Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!topUsers.length">
                <TableCell colspan="3" class="text-center">No customers</TableCell>
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
        <h2 class="pb-3 text-lg font-medium">Orders</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead class="text-right">Items</TableHead>
              <TableHead class="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!(orders as any[])?.length">
              <TableCell colspan="4" class="text-center">No orders on this day</TableCell>
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
