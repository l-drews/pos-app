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
  { key: "nav.shop", icon: Store, path: "/shop" },
  { key: "nav.products", icon: Tag, path: "/products" },
  { key: "nav.users", icon: User, path: "/users" },
  { key: "nav.groups", icon: Users, path: "/groups" },
  { key: "nav.orders", icon: ShoppingCart, path: "/orders" },
  { key: "nav.transactions", icon: CreditCard, path: "/transactions" },
  { key: "nav.summary", icon: BarChart3, path: "/summary" },
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
        :key="item.key"
        :reduce="reduce"
        :title="$t(item.key)"
        :icon="item.icon"
        :path="item.path"
      />
    </nav>
    <LocaleSwitcher class="pb-2" />
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
