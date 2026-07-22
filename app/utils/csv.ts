/**
 * Decode a CSV file's bytes to text. Excel on Windows commonly saves CSVs as
 * "ANSI" (Windows-1252), and decoding those as UTF-8 mangles German special
 * characters (ö/ä/ü/ß each become "�"). Try strict UTF-8 first — `fatal`
 * makes the decoder throw on invalid bytes instead of substituting "�" — and
 * fall back to Windows-1252 when the file isn't valid UTF-8.
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}
