<script setup lang="ts">
import { Trash2 } from "lucide-vue-next";

// Shows a single order's line items. Expects an order with `items` that each
// include their `product` (see orders.list / orders.getByUser).
// With `deletable`, a delete button emits `on-delete` — confirmation and the
// actual mutation are the parent page's job.
const props = defineProps<{ order?: any | null; deletable?: boolean }>();
const active = defineModel<boolean>("active", { default: false });
const emit = defineEmits<{ "on-delete": [order: any] }>();
</script>

<template>
  <Dialog :open="active" @update:open="active = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ $t("orders.details") }}</DialogTitle>
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
            <TableHead>{{ $t("orders.product") }}</TableHead>
            <TableHead class="text-right">{{ $t("orders.qty") }}</TableHead>
            <TableHead class="text-right">{{ $t("orders.unitPrice") }}</TableHead>
            <TableHead class="text-right">{{ $t("common.total") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!props.order.items?.length">
            <TableCell colspan="4" class="text-center">{{ $t("orders.noItemsInOrder") }}</TableCell>
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
            <TableCell colspan="3" class="text-right font-medium">{{ $t("common.total") }}</TableCell>
            <TableCell class="text-right font-semibold">
              {{ formatCents(props.order.amount ?? 0) }}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <DialogFooter v-if="props.deletable && props.order">
        <Button variant="destructive" @click="emit('on-delete', props.order)">
          <Trash2 class="mr-2 size-4" />
          {{ $t("orders.delete") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
