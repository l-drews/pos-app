<script setup lang="ts">
import { isUserBarcode, isProductBarcode } from "~/utils/barcode";

const shop = useShopStore();

// Barcode scanner logic — process accumulated digits on Enter
const barcode = ref("");

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  if (e.key === "Enter") {
    const tmp = barcode.value;
    barcode.value = "";

    if (isProductBarcode(tmp)) {
      shop.addCartItem(tmp);
      return;
    }

    if (isUserBarcode(tmp)) {
      if (
        shop.userBarcode &&
        shop.userBarcode !== tmp &&
        shop.paymentTotal !== 0
      ) {
        shop.createOrder();
      }
      shop.selectUser(tmp);
      return;
    }

    shop.createOrder();
  } else if (/^\d$/.test(e.key)) {
    barcode.value += e.key;
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));

function userFormatter(user: any) {
  if (user.group) {
    return `${user.firstName} ${user.lastName} - ${user.group.name}`;
  }
  return `${user.firstName} ${user.lastName}`;
}

const defaultImageUrl = "/images/default-avatar.png";

const userData = computed(() => [
  { label: "Name:", value: shop.currentUser ? `${shop.currentUser.firstName} ${shop.currentUser.lastName}` : "-" },
  { label: "Birthdate:", value: shop.currentUser?.birthDate || "-" },
  { label: "Group:", value: (shop.currentUser as any)?.group?.name || "-" },
  { label: "Balance:", value: shop.currentUser ? formatCents(shop.currentUser.balance ?? 0) : "-" },
]);
</script>

<template>
  <section class="container h-full mx-auto">
    <div class="flex h-full flex-row gap-x-4">
      <!-- Cart Table -->
      <div class="w-3/4 p-4 h-full bg-white rounded">
        <o-table :data="shop.cartItems ?? []">
          <template #empty>
            <div class="m-4 text-center">
              No items found. Please scan an item.
            </div>
          </template>
          <o-table-column v-slot="props" field="product.name" label="Name" sortable>
            {{ props.row.product?.name }}
          </o-table-column>
          <o-table-column v-slot="props" label="Price" sortable>
            {{ formatCents(props.row.product?.price ?? 0) }}
          </o-table-column>
          <o-table-column v-slot="props" field="count" label="Count" width="130" sortable>
            <o-field>
              <o-input
                :model-value="props.row.count"
                numeric
                group
                expanded
                :icon="props.row.count === 1 ? 'delete' : 'minus'"
                icon-clickable
                icon-right="plus"
                icon-right-clickable
                @icon-click="props.row.count === 1 ? shop.deleteItem(props.row) : shop.decrementCount(props.row)"
                @icon-right-click="shop.incrementCount(props.row)"
              />
            </o-field>
          </o-table-column>
        </o-table>
      </div>

      <!-- Sidebar -->
      <div class="w-1/4 p-4 h-full bg-white rounded flex flex-col justify-between">
        <div>
          <o-autocomplete
            v-model="shop.searchString"
            :custom-formatter="userFormatter"
            expanded
            :data="shop.filteredUsers"
            placeholder="User"
            icon="magnify"
            clearable
            @select="(user: any) => shop.selectUser(user?.barcode ?? '')"
          >
            <template #empty>No results found</template>
          </o-autocomplete>
          <div class="py-4 flex flex-row justify-center">
            <img
              class="h-32 aspect-square object-cover rounded-full border border-inherit drop-shadow"
              :src="(shop.currentUser as any)?.imageUrl ?? defaultImageUrl"
            />
          </div>
          <ul>
            <li
              v-for="item in userData"
              :key="item.label"
              class="flex flex-row justify-between gap-4 pb-2 last:pb-0"
            >
              <span>{{ item.label }}</span>
              <span class="text-right">{{ item.value }}</span>
            </li>
          </ul>
        </div>
        <div>
          <div class="flex flex-row justify-between pb-2">
            <span>Total:</span>
            <span>{{ formatCents(shop.paymentTotal) }}</span>
          </div>
          <div class="flex flex-row justify-between pb-2">
            <span>Today's total:</span>
            <span>{{ formatCents(shop.todaysOrderTotal) }}</span>
          </div>
          <o-button
            expanded
            variant="success"
            :disabled="shop.disablePayment"
            @click="shop.createOrder()"
          >
            Pay
          </o-button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
:deep() .o-input {
  text-align: center;
}
</style>
