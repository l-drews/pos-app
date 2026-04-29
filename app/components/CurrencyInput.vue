<script setup lang="ts">
import {
  CurrencyDisplay,
  ValueScaling,
  useCurrencyInput,
  type CurrencyInputOptions,
} from "vue-currency-input";

const props = defineProps<{
  modelValue?: number;
}>();

const options: CurrencyInputOptions = {
  locale: "de-DE",
  currency: "EUR",
  currencyDisplay: CurrencyDisplay.symbol,
  precision: 2,
  hideCurrencySymbolOnFocus: false,
  hideGroupingSeparatorOnFocus: false,
  hideNegligibleDecimalDigitsOnFocus: false,
  autoDecimalDigits: true,
  valueScaling: ValueScaling.precision,
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
  <Input ref="inputRef" type="text" required />
</template>
