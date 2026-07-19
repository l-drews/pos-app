<script setup lang="ts">
// Shows a single order's line items. Expects an order with `items` that each
// include their `product` (see orders.list / orders.getByUser).
const props = defineProps<{ order?: any | null }>();
const active = defineModel<boolean>("active", { default: false });
</script>

<template>
  <Dialog :open="active" @update:open="active = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Order details</DialogTitle>
        <DialogDescription v-if="props.order">
          <span v-if="props.order.user">
            {{ props.order.user.firstName }} {{ props.order.user.lastName }} ·
          </span>
          {{ formatDateTime(props.order.createdAt) }}
        </DialogDescription>
      </DialogHeader>

      <Table v-if="props.order">
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead class="text-right">Qty</TableHead>
            <TableHead class="text-right">Unit price</TableHead>
            <TableHead class="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!props.order.items?.length">
            <TableCell colspan="4" class="text-center">No items</TableCell>
          </TableRow>
          <TableRow v-for="item in props.order.items" :key="item.uuid">
            <TableCell>{{ item.product?.name ?? "—" }}</TableCell>
            <TableCell class="text-right">{{ item.count }}</TableCell>
            <TableCell class="text-right">
              {{ formatCents(item.count ? Math.round(item.amount / item.count) : 0) }}
            </TableCell>
            <TableCell class="text-right">{{ formatCents(item.amount ?? 0) }}</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colspan="3" class="text-right font-medium">Total</TableCell>
            <TableCell class="text-right font-semibold">
              {{ formatCents(props.order.amount ?? 0) }}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </DialogContent>
  </Dialog>
</template>
