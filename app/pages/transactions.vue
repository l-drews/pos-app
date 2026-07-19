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
  orpc.transactions.list.queryOptions({
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

const transactions = computed(() => data.value?.rows ?? []);
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

const createMutation = useToastMutation({
  ...orpc.transactions.create.mutationOptions(),
  // A new transaction is the newest row, so jump back to the first page.
  onSuccess: () => {
    page.value = 0;
  },
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
      :title="$t('transactions.create')"
      @on-confirm="addItem"
    />

    <div class="flex justify-between items-center pb-4">
      <Button @click.stop="showForm()">{{ $t("transactions.create") }}</Button>
      <Button variant="outline" size="icon" @click="refresh()">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <div class="rounded-lg border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t("common.user") }}</TableHead>
            <TableHead>{{ $t("common.type") }}</TableHead>
            <SortableHead column="amount" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.amount") }}
            </SortableHead>
            <SortableHead column="createdAt" :sort-by="sortBy" :sort-dir="sortDir" @sort="toggleSort">
              {{ $t("common.date") }}
            </SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading && !transactions.length">
            <TableCell colspan="4" class="text-center">{{ $t("common.loading") }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!transactions.length">
            <TableCell colspan="4" class="text-center">{{ $t("transactions.none") }}</TableCell>
          </TableRow>
          <TableRow v-for="tx in transactions" :key="(tx as any).uuid">
            <TableCell>{{ (tx as any).user?.firstName }} {{ (tx as any).user?.lastName }}</TableCell>
            <TableCell>
              <Badge :variant="tx.amount >= 0 ? 'default' : 'destructive'">
                {{ tx.amount >= 0 ? $t("transactions.depositBadge") : $t("transactions.withdrawBadge") }}
              </Badge>
            </TableCell>
            <TableCell>{{ formatCents(Math.abs(tx.amount)) }}</TableCell>
            <TableCell>{{ formatDateTime((tx as any).createdAt) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination v-model:page="page" :page-size="PAGE_SIZE" :total="total" />
    </div>
  </section>
</template>
