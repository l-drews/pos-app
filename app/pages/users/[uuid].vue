<script setup lang="ts">
import { useQuery, useQueryCache } from "@pinia/colada";
import { ArrowLeft, Pencil, Trash2, Banknote, Wallet } from "lucide-vue-next";

const route = useRoute();
const orpc = useOrpc();
const queryCache = useQueryCache();

const uuid = computed(() => route.params.uuid as string);

const { data: user, isLoading } = useQuery(
  orpc.users.getByUuid.queryOptions({ input: () => ({ uuid: uuid.value }) }),
);

const { data: orders } = useQuery(
  orpc.orders.getByUser.queryOptions({ input: () => ({ userUuid: uuid.value }) }),
);

const totalOrders = computed(() => orders.value?.length ?? 0);
const totalSpent = computed(() =>
  (orders.value ?? []).reduce((sum: number, o: any) => sum + (o.amount ?? 0), 0),
);

const editOpen = ref(false);
const transactionOpen = ref(false);
const withdrawConfirm = ref(false);
const deleteConfirm = ref(false);

const selectedOrder = ref<any>(null);
const orderDetailOpen = ref(false);
const orderDeleteConfirm = ref(false);

function openOrder(order: any) {
  selectedOrder.value = order;
  orderDetailOpen.value = true;
}

function invalidateUsers() {
  queryCache.invalidateQueries({ key: orpc.users.key() });
}

const updateMutation = useToastMutation({
  ...orpc.users.update.mutationOptions(),
  onSettled: invalidateUsers,
});

// Used by both the deposit/withdraw dialog and the "withdraw all" action.
const transactionMutation = useToastMutation({
  ...orpc.transactions.create.mutationOptions(),
  onSettled: () => {
    invalidateUsers();
    queryCache.invalidateQueries({ key: orpc.transactions.key() });
  },
});

const deleteMutation = useToastMutation({
  ...orpc.users.delete.mutationOptions(),
  onSuccess: () => navigateTo("/users"),
  onSettled: invalidateUsers,
});

const deleteOrderMutation = useToastMutation({
  ...orpc.orders.delete.mutationOptions(),
  onSettled: () => {
    // The refund changes the balance and removes a transaction.
    invalidateUsers();
    queryCache.invalidateQueries({ key: orpc.orders.key() });
    queryCache.invalidateQueries({ key: orpc.transactions.key() });
  },
});

function onOrderDeleteConfirm() {
  if (!selectedOrder.value) return;
  deleteOrderMutation.mutate({ uuid: selectedOrder.value.uuid });
  orderDetailOpen.value = false;
}

function onEditConfirm(payload: any) {
  updateMutation.mutate(payload);
}

function withdrawAll() {
  if (!user.value || user.value.balance <= 0) return;
  transactionMutation.mutate({ userUuid: uuid.value, amount: -user.value.balance });
}

function onTransactionConfirm(tx: { userUuid: string; amount: number }) {
  transactionMutation.mutate(tx);
}

function onDeleteConfirm() {
  deleteMutation.mutate({ uuid: uuid.value });
}
</script>

<template>
  <section class="container mx-auto p-4 space-y-4">
    <UserForm
      v-if="user"
      v-model:active="editOpen"
      :title="$t('users.editTitle')"
      :selected="(user as any)"
      @on-confirm="onEditConfirm"
    />
    <ConfirmDialog
      v-model:active="withdrawConfirm"
      :title="$t('users.withdrawTitle')"
      :body="
        $t('users.withdrawBody', {
          amount: formatCents(user?.balance ?? 0),
          name: `${user?.firstName} ${user?.lastName}`,
        })
      "
      :buttons="[$t('common.cancel'), $t('users.withdraw')]"
      @on-confirm="withdrawAll"
    />
    <ConfirmDialog
      v-model:active="deleteConfirm"
      :title="$t('users.deleteTitle')"
      :body="$t('users.deleteBody', { name: `${user?.firstName} ${user?.lastName}` })"
      :buttons="[$t('common.cancel'), $t('common.delete')]"
      @on-confirm="onDeleteConfirm"
    />
    <OrderDetailDialog
      v-model:active="orderDetailOpen"
      :order="selectedOrder"
      deletable
      @on-delete="orderDeleteConfirm = true"
    />
    <ConfirmDialog
      v-model:active="orderDeleteConfirm"
      :title="$t('orders.deleteTitle')"
      :body="
        $t('orders.deleteBody', {
          amount: formatCents(selectedOrder?.amount ?? 0),
          name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        })
      "
      :buttons="[$t('common.cancel'), $t('common.delete')]"
      @on-confirm="onOrderDeleteConfirm"
    />
    <TransactionForm
      v-model:active="transactionOpen"
      :title="$t('transactions.create')"
      :user="(user as any) ?? null"
      @on-confirm="onTransactionConfirm"
    />

    <div class="flex items-center justify-between">
      <Button variant="ghost" size="sm" @click="navigateTo('/users')">
        <ArrowLeft class="mr-2 size-4" />
        {{ $t("common.back") }}
      </Button>
      <div class="flex gap-2">
        <Button variant="outline" :disabled="!user" @click="editOpen = true">
          <Pencil class="mr-2 size-4" />
          {{ $t("common.edit") }}
        </Button>
        <Button variant="outline" :disabled="!user" @click="transactionOpen = true">
          <Wallet class="mr-2 size-4" />
          {{ $t("transactions.depositWithdraw") }}
        </Button>
        <Button
          variant="outline"
          :disabled="!user || user.balance <= 0"
          @click="withdrawConfirm = true"
        >
          <Banknote class="mr-2 size-4" />
          {{ $t("users.withdrawAll") }}
        </Button>
        <Button
          variant="destructive"
          :disabled="!user || user.balance !== 0"
          :title="user && user.balance !== 0 ? $t('users.deleteBlocked') : undefined"
          @click="deleteConfirm = true"
        >
          <Trash2 class="mr-2 size-4" />
          {{ $t("common.delete") }}
        </Button>
      </div>
    </div>

    <div v-if="isLoading" class="py-12 text-center text-muted-foreground">
      {{ $t("common.loading") }}
    </div>
    <div v-else-if="!user" class="py-12 text-center text-muted-foreground">
      {{ $t("users.notFound") }}
    </div>

    <template v-else>
      <div class="flex items-center gap-4 rounded-lg border bg-card p-6">
        <UserAvatar class="size-20" :src="(user as any).imageUrl" />
        <div>
          <h1 class="text-2xl font-semibold">
            {{ user.firstName }} {{ user.lastName }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ $t("common.barcode") }}: {{ user.barcode ?? "—" }} ·
            {{ $t("users.born") }} {{ formatDate(user.birthDate) }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("common.balance") }}</p>
          <p class="text-2xl font-bold">{{ formatCents(user.balance ?? 0) }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("common.orders") }}</p>
          <p class="text-2xl font-bold">{{ totalOrders }}</p>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <p class="text-sm text-muted-foreground">{{ $t("users.totalSpent") }}</p>
          <p class="text-2xl font-bold">{{ formatCents(totalSpent) }}</p>
        </div>
      </div>

      <div class="rounded-lg border bg-card p-4">
        <h2 class="pb-3 text-lg font-medium">{{ $t("common.orders") }}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{{ $t("common.date") }}</TableHead>
              <TableHead>{{ $t("common.items") }}</TableHead>
              <TableHead class="text-right">{{ $t("common.amount") }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!orders?.length">
              <TableCell colspan="3" class="text-center">{{ $t("users.noOrders") }}</TableCell>
            </TableRow>
            <TableRow
              v-for="order in orders"
              :key="(order as any).uuid"
              class="cursor-pointer"
              @click="openOrder(order)"
            >
              <TableCell>{{ formatDateTime((order as any).createdAt) }}</TableCell>
              <TableCell>{{ (order as any).items?.length ?? 0 }}</TableCell>
              <TableCell class="text-right">
                {{ formatCents((order as any).amount ?? 0) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </section>
</template>
