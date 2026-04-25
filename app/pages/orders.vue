<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: orders, isLoading } = useQuery(orpc.orders.getAll.queryOptions());

function refresh() {
  queryCache.invalidateQueries({ key: orpc.orders.key() });
}
</script>

<template>
  <section class="container mx-auto p-4 bg-white rounded">
    <div class="flex justify-end items-center pb-4">
      <o-button icon-right="refresh" @click="refresh()" />
    </div>

    <o-table :data="orders ?? []" :loading="isLoading" paginated per-page="15">
      <template #empty>
        <div class="m-4 text-center">No orders found</div>
      </template>
      <o-table-column v-slot="props" field="user" label="User" sortable>
        {{ props.row.user?.firstName }} {{ props.row.user?.lastName }}
      </o-table-column>
      <o-table-column v-slot="props" field="itemCount" label="Items" sortable>
        {{ props.row.items?.length ?? 0 }}
      </o-table-column>
      <o-table-column v-slot="props" field="amount" label="Amount" sortable>
        {{ formatCents(props.row.amount ?? 0) }}
      </o-table-column>
      <o-table-column v-slot="props" field="createdAt" label="Date" sortable>
        {{ props.row.createdAt }}
      </o-table-column>
    </o-table>
  </section>
</template>
