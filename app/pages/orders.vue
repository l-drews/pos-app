<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { RefreshCw } from "lucide-vue-next";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: orders, isLoading } = useQuery(orpc.orders.getAll.queryOptions());

function refresh() {
  queryCache.invalidateQueries({ key: orpc.orders.key() });
}
</script>

<template>
  <section class="container mx-auto p-4">
    <div class="flex justify-end items-center pb-4">
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="4" class="text-center">Loading...</TableCell>
          </TableRow>
          <TableRow v-else-if="!orders?.length">
            <TableCell colspan="4" class="text-center">No orders found</TableCell>
          </TableRow>
          <TableRow v-for="order in orders" :key="(order as any).uuid">
            <TableCell>{{ (order as any).user?.firstName }} {{ (order as any).user?.lastName }}</TableCell>
            <TableCell>{{ (order as any).items?.length ?? 0 }}</TableCell>
            <TableCell>{{ formatCents((order as any).amount ?? 0) }}</TableCell>
            <TableCell>{{ formatDateTime((order as any).createdAt) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
