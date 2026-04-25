<script setup lang="ts">
import { useQuery } from "@pinia/colada";

defineProps<{
  title: string;
  confirmText?: string;
  cancelText?: string;
}>();

const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{
  "on-confirm": [transaction: { userUuid: string; amount: number }];
  "on-cancel": [];
}>();

const orpc = useOrpc();
const { data: users } = useQuery(orpc.users.getAll.queryOptions({ enabled: active }));

const transactionType = ref<"deposit" | "withdraw">("deposit");
const searchString = ref("");
const selectedUser = ref<{ uuid: string; firstName: string; lastName: string; group?: { name: string } | null } | null>(null);
const amount = ref(0);

const filteredUsers = computed(() => {
  if (!users.value) return [];
  const q = searchString.value.toLowerCase();
  return users.value.filter((u: any) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
  );
});

function userFormatter(user: any) {
  if (user.group) {
    return `${user.firstName} ${user.lastName} - ${user.group.name}`;
  }
  return `${user.firstName} ${user.lastName}`;
}

watch(active, (val) => {
  if (val) {
    transactionType.value = "deposit";
    searchString.value = "";
    selectedUser.value = null;
    amount.value = 0;
  }
});

function onCancel() {
  active.value = false;
  emit("on-cancel");
}

function onConfirm() {
  if (!selectedUser.value) return;
  const finalAmount =
    transactionType.value === "deposit" ? amount.value : -amount.value;
  active.value = false;
  emit("on-confirm", {
    userUuid: selectedUser.value.uuid,
    amount: finalAmount,
  });
}
</script>

<template>
  <o-modal v-model:active="active" scroll="clip" :can-cancel="false">
    <div class="p-4">
      <div class="pb-4">
        <h5>{{ title }}</h5>
      </div>
      <div class="pb-4">
        <o-field grouped label="User">
          <o-autocomplete
            v-model="searchString"
            :custom-formatter="userFormatter"
            expanded
            :data="filteredUsers"
            placeholder="User"
            icon="magnify"
            clearable
            @select="(user: any) => (selectedUser = user)"
          >
            <template #empty>No results found</template>
          </o-autocomplete>
        </o-field>
        <o-field grouped label="Type">
          <o-tabs v-model="transactionType" expanded type="toggle">
            <o-tab-item label="Deposit" value="deposit" icon="download" />
            <o-tab-item label="Withdraw" value="withdraw" icon="upload" />
          </o-tabs>
        </o-field>
        <o-field grouped label="Amount">
          <CurrencyInput v-model="amount" />
        </o-field>
      </div>
      <div class="flex flex-row justify-end gap-x-2">
        <o-button @click="onCancel()">{{ cancelText ?? "Cancel" }}</o-button>
        <o-button @click="onConfirm()">{{ confirmText ?? "Save" }}</o-button>
      </div>
    </div>
  </o-modal>
</template>

<style scoped>
:deep() .o-tabs__content {
  display: none;
}
</style>
