/** User barcodes start with prefix 957 (EAN-8 format). */
export function isUserBarcode(barcode: string): boolean {
  return /^\d{8}$/.test(barcode) && barcode.startsWith("957");
}

/** Product barcodes are any valid barcode that is NOT a user barcode. */
export function isProductBarcode(barcode: string): boolean {
  return barcode.length >= 4 && !isUserBarcode(barcode);
}
