import fs from "node:fs";
import path from "node:path";
import { createError, defineEventHandler, getRouterParam, setResponseHeader } from "h3";
import { imagesDir, mimeForFile } from "~~/server/utils/images";

// Serves uploaded user images in dev (the Electron build serves them through
// the app:// protocol handler instead).
export default defineEventHandler((event) => {
  // basename() confines the lookup to the images directory.
  const name = path.basename(getRouterParam(event, "name") ?? "");
  const filePath = path.join(imagesDir(), name);
  if (!name || !fs.existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  setResponseHeader(event, "Content-Type", mimeForFile(name));
  return fs.readFileSync(filePath);
});
