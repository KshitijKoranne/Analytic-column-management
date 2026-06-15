import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

export type StoredAttachment = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
};

export async function storeAttachment(file: File | null): Promise<StoredAttachment | null> {
  if (!file || file.size === 0) return null;

  const id = nanoid(12);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `uploads/${id}-${safeName}`;
  const outputPath = path.join(process.cwd(), storageKey);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storageKey
  };
}

export function attachmentFromForm(formData: FormData, key = "attachment") {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}
