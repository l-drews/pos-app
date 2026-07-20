<script setup lang="ts">
interface Product {
  uuid?: string;
  name: string;
  barcode?: string | null;
  price: number;
}

const props = defineProps<{
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
    product.value = props.selected
      ? { ...props.selected }
      : { name: "", barcode: "", price: 0 };
  }
});

function onCancel() {
  active.value = false;
  emit("on-cancel");
}

function onConfirm() {
  const barcode = product.value.barcode?.trim() ?? "";
  active.value = false;
  emit("on-confirm", {
    ...product.value,
    // An empty barcode must not be stored as "" (the unique constraint would
    // collide on the second barcode-less product): omit it on create, clear
    // it explicitly on update.
    barcode: barcode || (props.selected ? null : undefined),
    uuid: props.selected?.uuid,
  });
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
          <Label for="product-name">{{ $t("common.name") }}</Label>
          <Input id="product-name" v-model="product.name" :placeholder="$t('common.name')" />
        </div>
        <div class="grid gap-2">
          <Label for="product-barcode">{{ $t("common.barcode") }}</Label>
          <Input id="product-barcode" v-model="product.barcode" :placeholder="$t('common.barcode')" />
        </div>
        <div class="grid gap-2">
          <Label for="product-price">{{ $t("common.price") }}</Label>
          <CurrencyInput v-model="product.price" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel()">{{ cancelText ?? $t("common.cancel") }}</Button>
        <Button @click="onConfirm()">{{ confirmText ?? $t("common.save") }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
