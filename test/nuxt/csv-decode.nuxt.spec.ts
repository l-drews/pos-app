import { describe, it, expect } from "vitest";
import { decodeCsvBuffer } from "~/utils/csv";

// Windows-1252 and Latin-1 share all code points below 0x100, which covers
// the German special characters (ö ä ü ß).
const windows1252 = (s: string) =>
  Uint8Array.from([...s].map((c) => c.codePointAt(0)!)).buffer;

describe("decodeCsvBuffer", () => {
  it("decodes UTF-8 files unchanged", () => {
    const utf8 = new TextEncoder().encode("firstname;lastname\nJörg;Weiß");
    expect(decodeCsvBuffer(utf8.buffer)).toBe("firstname;lastname\nJörg;Weiß");
  });

  it("falls back to Windows-1252 for Excel ANSI files", () => {
    // file.text() (plain UTF-8 decoding) turns each of these into "�".
    const ansi = windows1252("firstname;lastname\nJörg;Größmann-Übüß");
    expect(decodeCsvBuffer(ansi)).toBe("firstname;lastname\nJörg;Größmann-Übüß");
  });

  it("keeps plain ASCII working through either path", () => {
    const ascii = windows1252("firstname;lastname\nJohn;Smith");
    expect(decodeCsvBuffer(ascii)).toBe("firstname;lastname\nJohn;Smith");
  });
});
