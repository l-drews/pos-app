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
        <AlertDialogTitle>{{ title ?? "Confirm" }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ body ?? "Are you sure?" }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="onCancel()">
          {{ buttons?.[0] ?? "Cancel" }}
        </AlertDialogCancel>
        <AlertDialogAction @click="onConfirm()">
          {{ buttons?.[1] ?? "Confirm" }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
