<template>
  <div class="flex h-screen">
    <Navigation />
    <main class="flex-1 overflow-auto bg-gray-100 p-4">
      <slot />
    </main>
  </div>
</template>