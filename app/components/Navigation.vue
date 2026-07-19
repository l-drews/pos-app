<script setup lang="ts">
import {
  Store,
  Tag,
  User,
  Users,
  ShoppingCart,
  CreditCard,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
} from "lucide-vue-next";

const reduce = ref(false);

const { version, gitSha, buildTime } = useRuntimeConfig().public;
const buildInfo = `v${version} (${gitSha}) · built ${formatDateTime(buildTime)}`;

const items = [
  { title: "Shop", icon: Store, path: "/shop" },
  { title: "Products", icon: Tag, path: "/products" },
  { title: "Users", icon: User, path: "/users" },
  { title: "Groups", icon: Users, path: "/groups" },
  { title: "Orders", icon: ShoppingCart, path: "/orders" },
  { title: "Transactions", icon: CreditCard, path: "/transactions" },
  { title: "Summary", icon: BarChart3, path: "/summary" },
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
    <div
      class="border-t border-sidebar-border px-2 py-2 text-center text-xs text-muted-foreground truncate"
      :title="buildInfo"
      data-testid="build-info"
    >
      <template v-if="reduce">{{ gitSha }}</template>
      <template v-else>v{{ version }} ({{ gitSha }})</template>
    </div>
  </aside>
</template>
