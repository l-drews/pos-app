<script setup lang="ts">
const reduce = ref(false);

const items = [
  { title: "Shop", icon: "store", path: "/shop" },
  { title: "Products", icon: "tag", path: "/products" },
  { title: "Users", icon: "account", path: "/users" },
  { title: "Groups", icon: "account-group", path: "/groups" },
  { title: "Orders", icon: "cart", path: "/orders" },
  { title: "Transactions", icon: "credit-card", path: "/transactions" },
  { title: "Roles", icon: "shield-account", path: "/roles" },
];
</script>

<template>
  <aside
    class="h-screen bg-gray-800 text-gray-400 flex flex-col"
    :class="reduce ? 'w-16' : 'w-56'"
    data-testid="sidebar"
  >
    <button
      class="flex justify-center py-3 hover:text-white"
      @click="reduce = !reduce"
    >
      <svg
        class="w-8 h-8 fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z"
        />
      </svg>
    </button>
    <nav class="px-2 flex flex-col border-t border-gray-700 flex-1">
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
