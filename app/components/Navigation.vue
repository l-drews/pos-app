<script setup lang="ts">
import {
  Store,
  Tag,
  User,
  Users,
  ShoppingCart,
  CreditCard,
  ShieldCheck,
  PanelLeftClose,
  PanelLeft,
} from "lucide-vue-next";

const reduce = ref(false);

const items = [
  { title: "Shop", icon: Store, path: "/shop" },
  { title: "Products", icon: Tag, path: "/products" },
  { title: "Users", icon: User, path: "/users" },
  { title: "Groups", icon: Users, path: "/groups" },
  { title: "Orders", icon: ShoppingCart, path: "/orders" },
  { title: "Transactions", icon: CreditCard, path: "/transactions" },
  { title: "Roles", icon: ShieldCheck, path: "/roles" },
];
</script>

<template>
  <aside
    class="h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r"
    :class="reduce ? 'w-16' : 'w-56'"
    data-testid="sidebar"
  >
    <button
      class="flex justify-center py-3 hover:text-sidebar-primary"
      @click="reduce = !reduce"
    >
      <component :is="reduce ? PanelLeft : PanelLeftClose" class="size-6" />
    </button>
    <nav class="px-2 flex flex-col border-t border-sidebar-border flex-1">
      <NavigationItem
        v-for="item in items"
        :key="item.title"
        :reduce="reduce"
        :title="item.title"
        :icon="item.icon"
        :path="item.path"
      />
    </nav>
  </aside>
</template>
