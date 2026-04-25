<template>
  <h1>Home: {{ res }}</h1>
</template>

<script setup lang="ts">
const { $client } = useNuxtApp();
const res = await $client.ping();
</script>
