<template>
  <div class="flex h-screen">
    <Navigation />
    <main class="flex-1 overflow-auto bg-muted p-4">
      <slot />
    </main>
  </div>
</template>