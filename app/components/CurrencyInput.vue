<script setup lang="ts">
import { useCurrencyInput } from "vue-currency-input";

const props = defineProps<{
  modelValue?: number;
}>();

const options = {
  locale: "de-DE",
  currency: "EUR",
  currencyDisplay: "symbol" as const,
  precision: 2,
  hideCurrencySymbolOnFocus: false,
  hideGroupingSeparatorOnFocus: false,
  hideNegligibleDecimalDigitsOnFocus: false,
  autoDecimalDigits: true,
  valueScaling: "precision" as const,
  autoSign: false,
  useGrouping: false,
  accountingSign: false,
};

const { inputRef, setValue } = useCurrencyInput(options);

watch(
  () => props.modelValue,
  (value) => {
    setValue(value ?? 0);
  },
);
</script>

<template>
  <o-input ref="inputRef" type="text" required />
</template>
