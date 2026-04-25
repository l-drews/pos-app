<script setup lang="ts">
defineProps<{
  title: string;
  confirmText?: string;
  cancelText?: string;
  selected?: { uuid?: string; name: string } | null;
}>();

const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{
  "on-confirm": [role: { uuid?: string; name: string }];
  "on-cancel": [];
}>();

const role = ref({ name: "" });

watch(active, (val) => {
  if (val) {
    const props = getCurrentInstance()?.props;
    const sel = props?.selected as { uuid?: string; name: string } | null;
    role.value = sel ? { ...sel } : { name: "" };
  }
});

function onCancel() {
  active.value = false;
  emit("on-cancel");
}

function onConfirm() {
  const result = { ...role.value };
  const props = getCurrentInstance()?.props;
  const sel = props?.selected as { uuid?: string; name: string } | null;
  result.uuid = sel?.uuid;
  active.value = false;
  emit("on-confirm", result);
}
</script>

<template>
  <Dialog :open="active" @update:open="active = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="role-name">Name</Label>
          <Input id="role-name" v-model="role.name" placeholder="Role name" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel()">{{ cancelText ?? "Cancel" }}</Button>
        <Button @click="onConfirm()">{{ confirmText ?? "Save" }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
