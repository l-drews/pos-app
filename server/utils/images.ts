import fs from "node:fs";
import path from "node:path";

/**
 * Directory for uploaded user images. The Electron main process points
 * IMAGES_DIR at <userData>/images; dev falls back to .data/images
 * (gitignored, next to the dev database).
 */
export function imagesDir(): string {
  const dir = process.env.IMAGES_DIR ?? path.join(".data", "images");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function extForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

export function mimeForFile(name: string): string {
  const ext = path.extname(name).slice(1).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
