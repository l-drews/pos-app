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
  <AlertDialog :open="active" @update:open="active = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title ?? $t("common.confirm") }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ body ?? $t("common.areYouSure") }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="onCancel()">
          {{ buttons?.[0] ?? $t("common.cancel") }}
        </AlertDialogCancel>
        <AlertDialogAction @click="onConfirm()">
          {{ buttons?.[1] ?? $t("common.confirm") }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
