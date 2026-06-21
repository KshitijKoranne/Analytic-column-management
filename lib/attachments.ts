import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { nanoid } from "nanoid";

const maxAttachmentBytes = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["application/pdf", [".pdf"]],
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]]
]);

export type StoredAttachment = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksumSha256: string;
};

export async function storeAttachment(file: File | null): Promise<StoredAttachment | null> {
  if (!file || file.size === 0) return null;
  if (file.size > maxAttachmentBytes) {
    throw new Error("Attachment exceeds maximum size.");
  }

  const mimeType = file.type || "application/octet-stream";
  const extensions = allowedTypes.get(mimeType);
  if (!extensions) {
    throw new Error("Attachment type is not allowed.");
  }

  const id = nanoid(12);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const extension = path.extname(safeName).toLowerCase();
  if (!extensions.includes(extension)) {
    throw new Error("Attachment extension does not match its type.");
  }

  const storageKey = `uploads/${id}-${safeName}`;
  const storageRoot = process.env.VERCEL ? tmpdir() : process.cwd();
  const outputPath = path.join(storageRoot, storageKey);
  const buffer = Buffer.from(await file.arrayBuffer());
  validateSignature(buffer, mimeType);
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return {
    fileName: file.name,
    mimeType,
    sizeBytes: file.size,
    storageKey,
    checksumSha256
  };
}

function validateSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf" && buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throw new Error("Attachment content does not match its type.");
  }

  if (mimeType === "image/png" && !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error("Attachment content does not match its type.");
  }

  if (mimeType === "image/jpeg" && !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9)) {
    throw new Error("Attachment content does not match its type.");
  }
}

export function attachmentFromForm(formData: FormData, key = "attachment") {
  const value = formData.get(key);
  return value instanceof File ? value : null;
}

export function attachmentsFromForm(formData: FormData, key = "attachments") {
  const files = formData.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
  const legacy = attachmentFromForm(formData);
  return files.length ? files : legacy ? [legacy] : [];
}
