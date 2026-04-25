<script setup lang="ts">
defineProps<{
  title?: string;
  body?: string;
  buttons?: [string, string];
}>();

const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{
  "on-confirm": [];
  "on-cancel": [];
}>();

function onConfirm() {
  active.value = false;
  emit("on-confirm");
}

function onCancel() {
  active.value = false;
  emit("on-cancel");
}
</script>

<template>
  <o-modal v-model:active="active" scroll="clip" :can-cancel="false">
    <div class="p-4 w-96">
      <div v-if="title" class="pb-8">
        <h5>{{ title }}</h5>
      </div>
      <div class="pb-4">
        {{ body ?? "Are you sure?" }}
      </div>
      <div class="flex flex-row justify-end gap-x-2">
        <o-button @click="onCancel()">{{ buttons?.[0] ?? "Cancel" }}</o-button>
        <o-button @click="onConfirm()">{{ buttons?.[1] ?? "Confirm" }}</o-button>
      </div>
    </div>
  </o-modal>
</template>
