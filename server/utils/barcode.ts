const BARCODE_PREFIX = "957";

/**
 * Compute the EAN check digit using the GS1 algorithm.
 * Works for EAN-8, EAN-13, etc.
 */
export function getCheckDigit(digits: string): number {
  const nums = digits.split("").map(Number);
  const sum = nums.reduce((acc, n, i) => {
    const weight = (nums.length - i) % 2 === 0 ? 1 : 3;
    return acc + n * weight;
  }, 0);
  return (10 - (sum % 10)) % 10;
}

/**
 * Validate an EAN-8 barcode (8 digits with valid check digit).
 */
export function isValidEan8(barcode: string): boolean {
  if (!/^\d{8}$/.test(barcode)) return false;
  const payload = barcode.slice(0, 7);
  return getCheckDigit(payload) === Number(barcode[7]);
}

/**
 * Check if a barcode is a valid user barcode (EAN-8 with prefix 957).
 */
export function isValidUserBarcode(barcode: string): boolean {
  return barcode.startsWith(BARCODE_PREFIX) && isValidEan8(barcode);
}

/**
 * Generate the next user barcode.
 * Takes the current highest barcode (e.g. "95700073") and increments.
 * If no existing barcode, starts at "9570001X" (where X is check digit).
 */
export function generateNextUserBarcode(
  highestBarcode: string | null,
): string {
  let nextSeq: number;
  if (highestBarcode) {
    const seqStr = highestBarcode.slice(
      BARCODE_PREFIX.length,
      BARCODE_PREFIX.length + 4,
    );
    nextSeq = parseInt(seqStr, 10) + 1;
  } else {
    nextSeq = 1;
  }

  const payload = `${BARCODE_PREFIX}${String(nextSeq).padStart(4, "0")}`;
  const checkDigit = getCheckDigit(payload);
  return `${payload}${checkDigit}`;
}
