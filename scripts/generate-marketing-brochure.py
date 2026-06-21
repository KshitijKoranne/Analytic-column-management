from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas

ROOT = Path.cwd()
OUT_DIR = ROOT / "outputs" / "marketing"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "column-management-brochure.pdf"

W, H = letter

INK = colors.HexColor("#101828")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#D0D5DD")
SOFT = colors.HexColor("#F8FAFC")
TEAL = colors.HexColor("#0F766E")
NAVY = colors.HexColor("#16324F")
GREEN = colors.HexColor("#16A34A")
BLUE = colors.HexColor("#2563EB")
RED = colors.HexColor("#DC2626")
AMBER = colors.HexColor("#F59E0B")
WHITE = colors.white


def para(c, text, x, y, w, h, size=10, color=INK, leading=None, bold=False, align=0):
    style = ParagraphStyle(
        "copy",
        fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size,
        leading=leading or size * 1.25,
        textColor=color,
        alignment=align,
        spaceAfter=0,
        spaceBefore=0,
    )
    p = Paragraph(text, style)
    p.wrapOn(c, w, h)
    p.drawOn(c, x, y + h - p.height)


def pill(c, x, y, w, h, label, fill, text_color=WHITE):
    c.setFillColor(fill)
    c.setStrokeColor(fill)
    c.roundRect(x, y, w, h, 14, stroke=0, fill=1)
    para(c, label, x + 12, y + 4, w - 24, h - 8, size=9, color=text_color, bold=True, align=1)


def card(c, x, y, w, h, fill=WHITE, stroke=LINE):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, 12, stroke=1, fill=1)


def header(c, kicker, title, subtitle=None):
    para(c, kicker.upper(), 44, H - 58, 240, 14, size=8, color=TEAL, bold=True)
    para(c, title, 44, H - 145, 430, 80, size=28, color=INK, leading=33, bold=True)
    if subtitle:
        para(c, subtitle, 44, H - 205, 420, 48, size=12, color=MUTED, leading=16)


def footer(c, page):
    c.setStrokeColor(colors.HexColor("#EAECF0"))
    c.line(44, 38, W - 44, 38)
    para(c, "Column Management for QC Laboratories", 44, 20, 240, 12, size=7, color=colors.HexColor("#98A2B3"))
    para(c, f"{page:02d}", W - 70, 20, 26, 12, size=7, color=colors.HexColor("#98A2B3"), align=2)


def draw_lifecycle(c, x, y):
    steps = [
        ("Master", NAVY),
        ("Receipt", TEAL),
        ("Issue", BLUE),
        ("Perf.", GREEN),
        ("Destroy", RED),
    ]
    for i, (label, color) in enumerate(steps):
        sx = x + i * 102
        card(c, sx, y, 82, 60)
        c.setFillColor(color)
        c.circle(sx + 18, y + 34, 12, stroke=0, fill=1)
        para(c, str(i + 1), sx + 10, y + 27, 16, 12, size=8, color=WHITE, bold=True, align=1)
        para(c, label, sx + 34, y + 34, 44, 12, size=9, color=INK, bold=True)
        para(c, "Controlled", sx + 34, y + 18, 44, 12, size=6.5, color=MUTED)
        if i < len(steps) - 1:
            c.setStrokeColor(colors.HexColor("#98A2B3"))
            c.setLineWidth(1.2)
            c.line(sx + 84, y + 31, sx + 100, y + 31)


def draw_ui_panel(c, x, y, w, h):
    card(c, x, y, w, h, WHITE, LINE)
    c.setFillColor(colors.HexColor("#EEF6F4"))
    c.rect(x, y + h - 34, w, 34, stroke=0, fill=1)
    para(c, "Lifecycle command center", x + 18, y + h - 26, 170, 12, size=9, color=NAVY, bold=True)
    rows = [
        ("C18 column", "Pending", TEAL),
        ("Receipt", "Accepted", TEAL),
        ("Performance", "Recorded", TEAL),
        ("Destruction", "Approval", AMBER),
        ("Audit event", "Logged", TEAL),
    ]
    for i, (name, status, color) in enumerate(rows):
        ry = y + h - 64 - i * 28
        c.setStrokeColor(colors.HexColor("#EAECF0"))
        c.line(x + 18, ry + 20, x + w - 18, ry + 20)
        c.setFillColor(colors.HexColor("#ECFDF3") if i % 2 == 0 else colors.HexColor("#EFF8FF"))
        c.roundRect(x + 18, ry, 16, 16, 4, stroke=0, fill=1)
        para(c, name, x + 44, ry - 1, 100, 13, size=8, color=INK, bold=i == 0)
        para(c, status, x + w - 82, ry - 1, 62, 13, size=7.5, color=color, align=2)


def page_one(c):
    c.setFillColor(SOFT)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    header(
        c,
        "QC laboratory software",
        "Column control without spreadsheet risk",
        "Purpose-built lifecycle management for analytical columns in pharma API QC laboratories.",
    )
    pill(c, 44, 545, 130, 28, "Audit-ready", TEAL)
    pill(c, 184, 545, 150, 28, "Role-controlled", NAVY)
    pill(c, 344, 545, 132, 28, "Workflow-led", BLUE)

    card(c, 44, 340, 250, 150)
    para(c, "What it replaces", 68, 456, 180, 18, size=13, color=INK, bold=True)
    para(c, "Disconnected spreadsheets, manual review trackers, informal role control, and scattered attachment evidence.", 68, 378, 190, 62, size=10.5, color=MUTED, leading=14)

    card(c, 318, 340, 250, 150)
    para(c, "What it creates", 342, 456, 180, 18, size=13, color=INK, bold=True)
    para(c, "One controlled lifecycle across masters, receipts, issuance, performance, destruction, reviews, and audit trail.", 342, 378, 190, 62, size=10.5, color=MUTED, leading=14)

    draw_lifecycle(c, 54, 176)
    c.setFillColor(NAVY)
    c.roundRect(44, 74, W - 88, 58, 14, stroke=0, fill=1)
    para(c, "Structured, simple, and credible for a demo with QC, QA, and IT stakeholders.", 68, 90, W - 136, 24, size=13, color=WHITE, leading=16, bold=True, align=1)
    footer(c, 1)


def page_two(c):
    c.setFillColor(WHITE)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    header(
        c,
        "Why teams care",
        "Designed for real laboratory operations",
        "The application keeps entry simple for analysts while preserving control points for reviewers, managers, and administrators.",
    )

    features = [
        ("User administration", "Create users, assign roles during creation, and capture the action in audit trail."),
        ("Dynamic masters", "Define column masters, dimensions, units, and performance parameters as needed."),
        ("Workflow review", "Route master activation, receipt acceptance, performance failures, and destruction approvals."),
        ("Attachment evidence", "Attach files with server-side validation and checksum metadata."),
        ("Audit visibility", "Show who did what, when, against which record, with a reason where applicable."),
        ("Demo-ready scope", "Focused on the column lifecycle without heavyweight LIMS complexity."),
    ]
    for i, (title, body) in enumerate(features):
        x = 44 + (i % 2) * 274
        y = 380 - (i // 2) * 104
        card(c, x, y, 250, 82, colors.HexColor("#F9FAFB"), colors.HexColor("#E4E7EC"))
        para(c, title, x + 18, y + 52, 185, 14, size=11, color=INK, bold=True)
        para(c, body, x + 18, y + 16, 205, 32, size=8.5, color=MUTED, leading=11)

    c.setFillColor(NAVY)
    c.roundRect(44, 54, W - 88, 82, 14, stroke=0, fill=1)
    para(c, "Positioning", 68, 104, 120, 14, size=9, color=colors.HexColor("#A7F3D0"), bold=True)
    para(c, "Column Management helps QC laboratories make analytical column control easier to run, easier to review, and easier to defend.", 68, 70, 430, 28, size=13, color=WHITE, leading=16, bold=True)
    footer(c, 2)


def main():
    c = canvas.Canvas(str(PDF_PATH), pagesize=letter)
    page_one(c)
    c.showPage()
    page_two(c)
    c.save()
    print(PDF_PATH)


if __name__ == "__main__":
    main()
