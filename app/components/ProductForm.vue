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
  <Dialog :open="active" @update:open="active = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="product-name">Name</Label>
          <Input id="product-name" v-model="product.name" placeholder="Name" />
        </div>
        <div class="grid gap-2">
          <Label for="product-barcode">Barcode</Label>
          <Input id="product-barcode" v-model="product.barcode" placeholder="Barcode" />
        </div>
        <div class="grid gap-2">
          <Label for="product-price">Price</Label>
          <CurrencyInput v-model="product.price" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onCancel()">{{ cancelText ?? "Cancel" }}</Button>
        <Button @click="onConfirm()">{{ confirmText ?? "Save" }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
