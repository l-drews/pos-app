<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { Search, ArrowDownToLine, ArrowUpFromLine, Check, ChevronsUpDown } from "lucide-vue-next";

const props = defineProps<{
  title: string;
  confirmText?: string;
  cancelText?: string;
  /** When set, the form is scoped to this user and the picker is hidden. */
  user?: { uuid: string; firstName: string; lastName: string; group?: { name: string } | null } | null;
}>();

const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{
  "on-confirm": [transaction: { userUuid: string; amount: number }];
  "on-cancel": [];
}>();

const orpc = useOrpc();
// The user list is only needed when the form has to offer a picker.
const needsPicker = computed(() => active.value && !props.user);
const { data: users } = useQuery(
  orpc.users.getAll.queryOptions({ enabled: needsPicker }),
);

const transactionType = ref<"deposit" | "withdraw">("deposit");
const searchString = ref("");
const selectedUser = ref<{ uuid: string; firstName: string; lastName: string; group?: { name: string } | null } | null>(null);
const amount = ref(0);
const comboOpen = ref(false);

const filteredUsers = computed(() => {
  if (!users.value) return [];
  const q = searchString.value.toLowerCase();
  return users.value.filter((u: any) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q),
  );
});

function userLabel(user: any) {
  if (user.group) {
    return `${user.firstName} ${user.lastName} - ${user.group.name}`;
  }
  return `${user.firstName} ${user.lastName}`;
}

watch(active, (val) => {
  if (val) {
    transactionType.value = "deposit";
    searchString.value = "";
    selectedUser.value = props.user ?? null;
    amount.value = 0;
  }
});

function selectUser(user: any) {
  selectedUser.value = user;
  comboOpen.value = false;
}

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
  <Dialog :open="active" @update:open="active = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div v-if="user" class="grid gap-2">
          <Label>{{ $t("common.user") }}</Label>
          <p class="text-sm font-medium">{{ userLabel(user) }}</p>
        </div>
        <div v-else class="grid gap-2">
          <Label>{{ $t("common.user") }}</Label>
          <Popover v-model:open="comboOpen">
            <PopoverTrigger as-child>
              <Button variant="outline" role="combobox" class="justify-between w-full">
                <span class="truncate">{{ selectedUser ? userLabel(selectedUser) : $t("shop.selectUser") }}</span>
                <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-full p-0" align="start">
              <Command>
                <CommandInput v-model="searchString" :placeholder="$t('shop.searchUser')" />
                <CommandEmpty>{{ $t("shop.noUsersFound") }}</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      v-for="u in filteredUsers"
                      :key="u.uuid"
                      :value="userLabel(u)"
                      @select="selectUser(u)"
                    >
                      <Check class="mr-2 size-4" :class="selectedUser?.uuid === u.uuid ? 'opacity-100' : 'opacity-0'" />
                      {{ userLabel(u) }}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div class="grid gap-2">
          <Label>{{ $t("common.type") }}</Label>
          <Tabs v-model="transactionType" class="w-full">
            <TabsList class="grid w-full grid-cols-2">
              <TabsTrigger value="deposit" class="flex items-center gap-1">
                <ArrowDownToLine class="size-4" />
                {{ $t("transactions.deposit") }}
              </TabsTrigger>
              <TabsTrigger value="withdraw" class="flex items-center gap-1">
                <ArrowUpFromLine class="size-4" />
                {{ $t("transactions.withdraw") }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div class="grid gap-2">
          <Label>{{ $t("common.amount") }}</Label>
          <CurrencyInput v-model="amount" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel()">{{ cancelText ?? $t("common.cancel") }}</Button>
        <Button :disabled="!selectedUser || amount <= 0" @click="onConfirm()">
          {{ confirmText ?? $t("common.save") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
