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
  <o-modal v-model:active="active" scroll="clip" :can-cancel="false">
    <div class="p-4">
      <div class="pb-4">
        <h5>{{ title }}</h5>
      </div>
      <div class="pb-4">
        <o-field grouped label="Name">
          <o-input v-model="role.name" placeholder="Role name" expanded />
        </o-field>
      </div>
      <div class="flex flex-row justify-end gap-x-2">
        <o-button @click="onCancel()">{{ cancelText ?? "Cancel" }}</o-button>
        <o-button @click="onConfirm()">{{ confirmText ?? "Save" }}</o-button>
      </div>
    </div>
  </o-modal>
</template>
