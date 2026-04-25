<script setup lang="ts">
import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import { RefreshCw } from "lucide-vue-next";

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
  <section class="container mx-auto p-4">
    <TransactionForm
      v-model:active="inputForm"
      title="Create transaction"
      @on-confirm="addItem"
    />

    <div class="flex justify-between items-center pb-4">
      <Button @click.stop="showForm()">Create transaction</Button>
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="4" class="text-center">Loading...</TableCell>
          </TableRow>
          <TableRow v-else-if="!transactions.length">
            <TableCell colspan="4" class="text-center">No transactions found</TableCell>
          </TableRow>
          <TableRow v-for="tx in transactions" :key="(tx as any).uuid">
            <TableCell>{{ (tx as any).user?.firstName }} {{ (tx as any).user?.lastName }}</TableCell>
            <TableCell>
              <Badge :variant="tx.amount >= 0 ? 'default' : 'destructive'">
                {{ tx.amount >= 0 ? "deposit" : "withdraw" }}
              </Badge>
            </TableCell>
            <TableCell>{{ formatCents(Math.abs(tx.amount)) }}</TableCell>
            <TableCell>{{ (tx as any).createdAt }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
