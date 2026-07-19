<script setup lang="ts">
import { isUserBarcode, isProductBarcode } from "~/utils/barcode";
import {
  Minus,
  Plus,
  Trash2,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-vue-next";

const shop = useShopStore();

const barcode = ref("");
const comboOpen = ref(false);

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  if (e.key === "Enter") {
    const tmp = barcode.value;
    barcode.value = "";

    if (isProductBarcode(tmp)) {
      e.preventDefault();
      shop.addCartItem(tmp);
      return;
    }

    if (isUserBarcode(tmp)) {
      e.preventDefault();
      // Settle the previous customer's open cart before switching. Compare
      // against the selected user (not the scanned barcode) so this also
      // works when the user was picked via the combobox.
      if (
        shop.currentUser &&
        shop.currentUser.barcode !== tmp &&
        shop.paymentTotal !== 0
      ) {
        shop.createOrder();
      }
      shop.selectUser(tmp);
      return;
    }

    // A non-empty unrecognized buffer is a stray or partial scan — discard it
    // rather than treating Enter as a payment.
    if (tmp !== "") return;

    // Bare Enter pays, unless it is activating a focused control (whose own
    // handler already runs on Enter).
    if (tag === "BUTTON" || tag === "A") return;
    shop.createOrder();
  } else if (/^\d$/.test(e.key)) {
    barcode.value += e.key;
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));

function userLabel(user: any) {
  if (user.group) {
    return `${user.firstName} ${user.lastName} - ${user.group.name}`;
  }
  return `${user.firstName} ${user.lastName}`;
}

function selectShopUser(user: any) {
  // Select by uuid — combobox users may not have a barcode.
  if (user?.uuid) shop.selectUserByUuid(user.uuid);
  comboOpen.value = false;
}

const userData = computed(() => [
  {
    label: "Name:",
    value: shop.currentUser
      ? `${shop.currentUser.firstName} ${shop.currentUser.lastName}`
      : "-",
  },
  {
    label: "Birthdate:",
    value: shop.currentUser?.birthDate
      ? formatDate(shop.currentUser.birthDate)
      : "-",
  },
  { label: "Group:", value: (shop.currentUser as any)?.group?.name || "-" },
  {
    label: "Balance:",
    value: shop.currentUser ? formatCents(shop.currentUser.balance ?? 0) : "-",
  },
]);
</script>

<template>
  <section class="container h-full mx-auto p-4">
    <div class="flex h-full flex-row gap-x-4">
      <!-- Cart Table -->
      <div class="w-3/4 h-full">
        <div class="rounded-lg border p-4 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead class="w-[130px]">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!shop.cartItems?.length">
                <TableCell colspan="3" class="text-center">
                  No items found. Please scan an item.
                </TableCell>
              </TableRow>
              <TableRow
                v-for="item in shop.cartItems"
                :key="item.uuid"
              >
                <TableCell>{{ item.product?.name }}</TableCell>
                <TableCell>{{
                  formatCents(item.product?.price ?? 0)
                }}</TableCell>
                <TableCell>
                  <div class="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      class="h-7 w-7"
                      @click="
                        item.count === 1
                          ? shop.deleteItem(item)
                          : shop.decrementCount(item)
                      "
                    >
                      <Trash2 v-if="item.count === 1" class="size-3" />
                      <Minus v-else class="size-3" />
                    </Button>
                    <span class="w-8 text-center text-sm">{{
                      item.count
                    }}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      class="h-7 w-7"
                      @click="shop.incrementCount(item)"
                    >
                      <Plus class="size-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Sidebar -->
      <div
        class="w-1/4 p-4 h-full rounded-md border bg-card flex flex-col justify-between"
      >
        <div>
          <Popover v-model:open="comboOpen">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                role="combobox"
                class="justify-between w-full"
              >
                <span class="truncate">{{
                  shop.currentUser
                    ? userLabel(shop.currentUser)
                    : "Select a user..."
                }}</span>
                <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-full p-0" align="start">
              <Command>
                <CommandInput
                  v-model="shop.searchString"
                  placeholder="Search user..."
                />
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      v-for="u in shop.filteredUsers"
                      :key="u.uuid"
                      :value="userLabel(u)"
                      @select="selectShopUser(u)"
                    >
                      <Check
                        class="mr-2 size-4"
                        :class="
                          shop.currentUser?.uuid === u.uuid
                            ? 'opacity-100'
                            : 'opacity-0'
                        "
                      />
                      {{ userLabel(u) }}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div class="py-4 flex flex-row justify-center">
            <UserAvatar class="size-32" :src="(shop.currentUser as any)?.imageUrl" />
          </div>
          <ul>
            <li
              v-for="item in userData"
              :key="item.label"
              class="flex flex-row justify-between gap-4 pb-2 last:pb-0"
            >
              <span class="text-muted-foreground">{{ item.label }}</span>
              <span class="text-right font-medium">{{ item.value }}</span>
            </li>
          </ul>
        </div>
        <div>
          <div class="flex flex-row justify-between pb-2">
            <span class="text-muted-foreground">Total:</span>
            <span class="font-semibold">{{
              formatCents(shop.paymentTotal)
            }}</span>
          </div>
          <div class="flex flex-row justify-between pb-2">
            <span class="text-muted-foreground">Today's total:</span>
            <span class="font-semibold">{{
              formatCents(shop.todaysOrderTotal)
            }}</span>
          </div>
          <Button
            class="w-full"
            :disabled="shop.disablePayment"
            @click="shop.createOrder()"
          >
            Pay
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
