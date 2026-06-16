import { describe, expect, it } from "vitest";
import { storeAttachment } from "@/lib/attachments";

describe("attachments", () => {
  it("rejects unsupported file types", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    await expect(storeAttachment(file)).rejects.toThrow("Attachment type is not allowed.");
  });

  it("rejects mismatched file signatures", async () => {
    const file = new File(["not a pdf"], "report.pdf", { type: "application/pdf" });
    await expect(storeAttachment(file)).rejects.toThrow("Attachment content does not match its type.");
  });
});
