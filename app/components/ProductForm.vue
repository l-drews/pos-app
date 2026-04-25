<script setup lang="ts">
interface Product {
  uuid?: string;
  name: string;
  barcode: string;
  price: number;
}

defineProps<{
  title: string;
  confirmText?: string;
  cancelText?: string;
  selected?: Product | null;
}>();

const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{
  "on-confirm": [product: Product];
  "on-cancel": [];
}>();

const product = ref<Product>({ name: "", barcode: "", price: 0 });

watch(active, (val) => {
  if (val) {
    const props = getCurrentInstance()?.props;
    const sel = props?.selected as Product | null;
    product.value = sel
      ? { ...sel }
      : { name: "", barcode: "", price: 0 };
  }
});

function onCancel() {
  active.value = false;
  emit("on-cancel");
}

function onConfirm() {
  const result = { ...product.value };
  const props = getCurrentInstance()?.props;
  const sel = props?.selected as Product | null;
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
          <o-input v-model="product.name" placeholder="Name" expanded />
        </o-field>
        <o-field grouped label="Barcode">
          <o-input v-model="product.barcode" placeholder="Barcode" expanded />
        </o-field>
        <o-field grouped label="Price">
          <CurrencyInput v-model="product.price" />
        </o-field>
      </div>
      <div class="flex flex-row justify-end gap-x-2">
        <o-button @click="onCancel()">{{ cancelText ?? "Cancel" }}</o-button>
        <o-button @click="onConfirm()">{{ confirmText ?? "Save" }}</o-button>
      </div>
    </div>
  </o-modal>
</template>
