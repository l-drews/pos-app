type BarcodeHandler = (barcode: string) => void;

interface UseBarcodeScanner {
  start: () => void;
  stop: () => void;
}

/**
 * Composable that listens for barcode scanner input (rapid numeric keystrokes ending with Enter).
 * Typical barcode scanners input digits rapidly and finish with Enter.
 */
export function useBarcodeScanner(onScan: BarcodeHandler): UseBarcodeScanner {
  let buffer = "";
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function reset() {
    buffer = "";
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ignore if user is typing in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === "Enter" && buffer.length >= 4) {
      e.preventDefault();
      const barcode = buffer;
      reset();
      onScan(barcode);
      return;
    }

    if (/^\d$/.test(e.key)) {
      buffer += e.key;
      // Reset buffer after 100ms of inactivity (scanner inputs are rapid)
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(reset, 100);
    } else if (e.key !== "Shift") {
      reset();
    }
  }

  function start() {
    window.addEventListener("keydown", handleKeydown);
  }

  function stop() {
    window.removeEventListener("keydown", handleKeydown);
    reset();
  }

  onMounted(start);
  onUnmounted(stop);

  return { start, stop };
}
