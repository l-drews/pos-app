<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";

const orpc = useOrpc();
const queryCache = useQueryCache();

const { data: rawTransactions, isLoading } = useQuery(
  orpc.transactions.getAll.queryOptions(),
);

const transactions = computed(() => {
  if (!rawTransactions.value) return [];
  return [...rawTransactions.value].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
});

const createMutation = useMutation({
  ...orpc.transactions.create.mutationOptions(),
  onSettled: () => {
    queryCache.invalidateQueries({ key: orpc.transactions.key() });
    queryCache.invalidateQueries({ key: orpc.users.key() });
  },
});

const inputForm = ref(false);

function showForm() {
  inputForm.value = true;
}

function addItem(transaction: { userUuid: string; amount: number }) {
  createMutation.mutate(transaction);
}

function refresh() {
  queryCache.invalidateQueries({ key: orpc.transactions.key() });
}
</script>

<template>
  <section class="container mx-auto p-4 bg-white rounded">
    <TransactionForm
      v-model:active="inputForm"
      title="Create transaction"
      @on-confirm="addItem"
    />

    <div class="flex justify-between items-center pb-4">
      <o-button @click.stop="showForm()">Create transaction</o-button>
      <o-button icon-right="refresh" @click="refresh()" />
    </div>

    <o-table :data="transactions" :loading="isLoading" paginated per-page="15">
      <template #empty>
        <div class="m-4 text-center">No transactions found</div>
      </template>
      <o-table-column v-slot="props" field="user" label="User" sortable>
        {{ props.row.user?.firstName }} {{ props.row.user?.lastName }}
      </o-table-column>
      <o-table-column v-slot="props" field="type" label="Type" sortable>
        {{ props.row.amount >= 0 ? "deposit" : "withdraw" }}
      </o-table-column>
      <o-table-column v-slot="props" field="amount" label="Amount" sortable>
        {{ formatCents(Math.abs(props.row.amount)) }}
      </o-table-column>
      <o-table-column v-slot="props" field="createdAt" label="Date" sortable>
        {{ props.row.createdAt }}
      </o-table-column>
    </o-table>
  </section>
</template>
