import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "/Users/kshitij/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const root = process.cwd();
const outDir = path.join(root, "outputs", "marketing");
const previewDir = path.join(outDir, "deck-preview");
const finalPptx = path.join(outDir, "column-management-marketing-deck.pptx");

const C = {
  ink: "#101828",
  muted: "#667085",
  line: "#D0D5DD",
  soft: "#F8FAFC",
  white: "#FFFFFF",
  green: "#16A34A",
  teal: "#0F766E",
  navy: "#16324F",
  blue: "#2563EB",
  amber: "#F59E0B",
  red: "#DC2626"
};

const W = 1280;
const H = 720;
const page = { left: 70, top: 56, width: 1140, height: 608 };

function box(slide, x, y, w, h, fill = C.white, line = C.line, radius = "rounded-xl") {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    borderRadius: radius,
    shadow: "shadow-sm"
  });
}

function text(slide, body, x, y, w, h, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 }
  });
  shape.text = body;
  shape.text.style = {
    fontFace: "Aptos",
    fontSize: 18,
    color: C.ink,
    ...style
  };
  return shape;
}

function eyebrow(slide, label) {
  return text(slide, label.toUpperCase(), page.left, page.top, 520, 24, {
    fontSize: 12,
    bold: true,
    color: C.teal
  });
}

function title(slide, body, y = 92, w = 760) {
  return text(slide, body, page.left, y, w, 96, {
    fontSize: 42,
    bold: true,
    color: C.ink
  });
}

function footer(slide, n) {
  text(slide, "Column Management for QC Laboratories", page.left, 675, 420, 20, {
    fontSize: 11,
    color: "#98A2B3"
  });
  text(slide, String(n).padStart(2, "0"), 1160, 675, 48, 20, {
    fontSize: 11,
    color: "#98A2B3",
    alignment: "right"
  });
}

function bullet(slide, body, x, y, color = C.teal) {
  box(slide, x, y + 5, 10, 10, color, "none", "rounded-full");
  text(slide, body, x + 24, y, 430, 44, { fontSize: 18, color: C.ink });
}

function metric(slide, value, label, x, y, color) {
  box(slide, x, y, 245, 132, C.white, "#E4E7EC");
  text(slide, value, x + 22, y + 20, 190, 52, { fontSize: 44, bold: true, color });
  text(slide, label, x + 22, y + 78, 190, 38, { fontSize: 15, color: C.muted });
}

function uiPanel(slide, x, y, w, h, heading) {
  box(slide, x, y, w, h, C.white, "#D0D5DD", "rounded-2xl");
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: 44 },
    fill: "#EEF6F4",
    line: { style: "solid", fill: "none", width: 0 }
  });
  text(slide, heading, x + 22, y + 12, 260, 22, { fontSize: 14, bold: true, color: C.navy });
  for (let i = 0; i < 5; i += 1) {
    const rowY = y + 68 + i * 48;
    slide.shapes.add({
      geometry: "line",
      position: { left: x + 22, top: rowY - 12, width: w - 44, height: 0 },
      line: { style: "solid", fill: "#EAECF0", width: 1 }
    });
    box(slide, x + 22, rowY, 28, 28, i % 2 ? "#EFF8FF" : "#ECFDF3", "none", "rounded-lg");
    text(slide, ["C18 column", "Receipt", "Performance", "Destruction", "Audit event"][i], x + 62, rowY + 2, w - 220, 24, {
      fontSize: 14,
      color: C.ink,
      bold: i === 0
    });
    text(slide, ["Pending", "Accepted", "Recorded", "Manager approval", "Logged"][i], x + w - 150, rowY + 2, 104, 24, {
      fontSize: 13,
      color: i === 3 ? C.amber : C.teal,
      alignment: "right"
    });
  }
}

function lifecycle(slide) {
  const steps = [
    ["Master", C.navy],
    ["Receipt", C.teal],
    ["Issue", C.blue],
    ["Perf.", C.green],
    ["Destroy", C.red]
  ];
  steps.forEach(([label, color], i) => {
    const x = 108 + i * 220;
    box(slide, x, 320, 164, 88, "#FFFFFF", "#E4E7EC");
    box(slide, x + 20, 342, 38, 38, color, "none", "rounded-full");
    text(slide, String(i + 1), x + 31, 349, 20, 22, { fontSize: 17, color: C.white, bold: true, alignment: "center" });
    text(slide, label, x + 68, 340, 84, 28, { fontSize: 16, bold: true, color: C.ink });
    text(slide, "Controlled", x + 68, 368, 76, 18, { fontSize: 11, color: C.muted });
    text(slide, "state", x + 68, 384, 76, 18, { fontSize: 11, color: C.muted });
    if (i < steps.length - 1) {
      slide.shapes.add({
        geometry: "line",
        position: { left: x + 168, top: 363, width: 48, height: 0 },
        line: { style: "solid", fill: "#98A2B3", width: 2, beginArrowType: "none", endArrowType: "triangle" }
      });
    }
  });
}

async function main() {
  await fs.mkdir(previewDir, { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  let s = deck.slides.add();
  s.background.fill = C.soft;
  box(s, 760, 86, 390, 500, "#E6F4F1", "none", "rounded-3xl");
  box(s, 820, 145, 370, 310, C.white, "#D0D5DD", "rounded-2xl");
  uiPanel(s, 844, 170, 322, 250, "Lifecycle command center");
  eyebrow(s, "QC laboratory software");
  title(s, "Column Management built for regulated API laboratories", 126, 660);
  text(s, "A professional system to control analytical column masters, receipts, issuance, performance, destruction, roles, and audit evidence in one disciplined workflow.", page.left, 260, 610, 100, {
    fontSize: 22,
    color: C.muted
  });
  metric(s, "5", "Connected lifecycle modules", page.left, 420, C.teal);
  metric(s, "100%", "Audited critical actions", page.left + 275, 420, C.navy);
  footer(s, 1);

  s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "The problem");
  title(s, "Spreadsheets cannot carry regulated column lifecycle risk");
  bullet(s, "Column identity, usage, suitability, and destruction evidence often live in disconnected files.", 94, 240);
  bullet(s, "Approvals become hard to trace when review decisions sit outside the record.", 94, 315);
  bullet(s, "Admin rights need clear ownership, not informal access sharing.", 94, 390);
  box(s, 760, 146, 350, 380, "#F9FAFB", "#E4E7EC", "rounded-2xl");
  text(s, "Operational drag", 802, 190, 220, 30, { fontSize: 22, bold: true, color: C.ink });
  text(s, "Manual reconciliation\nDelayed reviews\nWeak traceability\nHigh audit effort", 802, 245, 240, 190, { fontSize: 26, color: C.navy, bold: true });
  footer(s, 2);

  s = deck.slides.add();
  s.background.fill = C.soft;
  eyebrow(s, "Connected lifecycle");
  title(s, "Every column moves through a controlled, visible path", 92, 780);
  lifecycle(s);
  text(s, "Each module shares the same record model: structured data, attachments, review states, and audit events. The result is a simple workflow that feels natural to QC personnel.", 152, 480, 980, 72, {
    fontSize: 22,
    color: C.muted,
    alignment: "center"
  });
  footer(s, 3);

  s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "Regulated controls");
  title(s, "Built around evidence, ownership, and review", 92, 710);
  const controls = [
    ["Role-based access", "Rights are assigned to roles and users at creation."],
    ["Audit trail", "Critical lifecycle, review, role, user, and attachment actions are logged."],
    ["Workflow reviews", "Pending tasks route to reviewers and managers with clear status."],
    ["Attachment integrity", "Files are checked by type and checksum metadata is stored."]
  ];
  controls.forEach(([h, b], i) => {
    const x = 88 + (i % 2) * 560;
    const y = 230 + Math.floor(i / 2) * 170;
    box(s, x, y, 500, 128, "#FFFFFF", "#E4E7EC");
    text(s, h, x + 28, y + 24, 260, 28, { fontSize: 22, bold: true, color: C.navy });
    text(s, b, x + 28, y + 62, 410, 42, { fontSize: 17, color: C.muted });
  });
  footer(s, 4);

  s = deck.slides.add();
  s.background.fill = C.soft;
  eyebrow(s, "Product experience");
  title(s, "A quiet interface for repeated laboratory work", 92, 710);
  uiPanel(s, 88, 220, 500, 330, "Receipt and performance activity");
  uiPanel(s, 650, 220, 500, 330, "Reviews and audit readiness");
  text(s, "Minimal forms. Dropdown-led entry. Clear status. No training-heavy screens.", 180, 590, 880, 46, {
    fontSize: 24,
    bold: true,
    color: C.navy,
    alignment: "center"
  });
  footer(s, 5);

  s = deck.slides.add();
  s.background.fill = C.white;
  eyebrow(s, "Administration");
  title(s, "Create users, assign roles, and preserve the audit story", 92, 790);
  box(s, 90, 230, 460, 270, "#F9FAFB", "#E4E7EC", "rounded-2xl");
  text(s, "New user", 122, 262, 180, 30, { fontSize: 22, bold: true, color: C.ink });
  ["Name", "Email", "Password", "Role: Analyst + Reviewer"].forEach((label, i) => {
    box(s, 122, 316 + i * 40, 360, 28, C.white, "#D0D5DD", "rounded-lg");
    text(s, label, 136, 322 + i * 40, 240, 18, { fontSize: 12, color: C.muted });
  });
  box(s, 720, 230, 380, 270, "#ECFDF3", "#BBF7D0", "rounded-2xl");
  text(s, "Audit capture", 752, 262, 180, 30, { fontSize: 22, bold: true, color: C.green });
  ["user.created", "role.permissions_updated", "review.approved", "attachment.uploaded"].forEach((event, index) => {
    box(s, 752, 318 + index * 42, 250, 30, "#FFFFFF", "#BBF7D0", "rounded-lg");
    text(s, event, 766, 324 + index * 42, 214, 18, { fontSize: 15, bold: true, color: C.navy });
  });
  footer(s, 6);

  s = deck.slides.add();
  s.background.fill = C.soft;
  eyebrow(s, "Demo storyline");
  title(s, "A credible demo in under ten minutes", 92, 710);
  const demo = [
    "Create a column master with performance parameters",
    "Receive a physical column against the approved master",
    "Issue it to QC personnel for an analytical method",
    "Record performance and attach evidence",
    "Route destruction through technical and manager review"
  ];
  demo.forEach((body, i) => {
    box(s, 120, 205 + i * 75, 920, 52, C.white, "#E4E7EC");
    box(s, 145, 218 + i * 75, 26, 26, i < 2 ? C.teal : i < 4 ? C.blue : C.red, "none", "rounded-full");
    text(s, String(i + 1), 153, 222 + i * 75, 10, 16, { fontSize: 12, bold: true, color: C.white, alignment: "center" });
    text(s, body, 190, 218 + i * 75, 700, 22, { fontSize: 19, color: C.ink });
  });
  footer(s, 7);

  s = deck.slides.add();
  s.background.fill = C.navy;
  text(s, "COLUMN MANAGEMENT", 80, 74, 340, 24, { fontSize: 12, bold: true, color: "#A7F3D0" });
  text(s, "Make analytical column control easier to run, easier to review, and easier to defend.", 80, 160, 850, 150, {
    fontSize: 44,
    bold: true,
    color: C.white
  });
  text(s, "For QC laboratories in pharma API organizations that need professional lifecycle control without heavyweight LIMS complexity.", 80, 335, 770, 70, {
    fontSize: 22,
    color: "#D1D5DB"
  });
  box(s, 80, 470, 260, 62, C.teal, "none");
  text(s, "Schedule a demo", 110, 489, 190, 24, { fontSize: 20, bold: true, color: C.white, alignment: "center" });
  box(s, 720, 440, 370, 120, "#234762", "none", "rounded-2xl");
  text(s, "Ready for pilot", 760, 470, 200, 28, { fontSize: 24, bold: true, color: C.white });
  text(s, "Masters - Receipts - Issuance - Performance - Destruction - Audit", 760, 510, 280, 30, { fontSize: 13, color: "#D1D5DB" });
  footer(s, 8);

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(previewDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(previewDir, `${stem}.layout.json`), await layout.text());
  }
  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(previewDir, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(finalPptx);
  console.log(finalPptx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
