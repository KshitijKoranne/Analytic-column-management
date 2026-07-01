export const dateFormatSettingKey = "date_format";
export const defaultDateFormat = "DD/MM/YY";
export const dateFormatOptions = ["DD/MM/YY", "DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YY"] as const;

export type DateFormat = (typeof dateFormatOptions)[number];

export function parseDateFormat(value?: string | null): DateFormat {
  return dateFormatOptions.includes(value as DateFormat) ? (value as DateFormat) : defaultDateFormat;
}

function parts(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    dd: pad(value.getDate()),
    mm: pad(value.getMonth() + 1),
    yy: pad(value.getFullYear() % 100),
    yyyy: String(value.getFullYear())
  };
}

export function formatDate(value: Date, format: DateFormat) {
  const { dd, mm, yy, yyyy } = parts(value);
  if (format === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (format === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  if (format === "MM/DD/YY") return `${mm}/${dd}/${yy}`;
  return `${dd}/${mm}/${yy}`;
}

export function isoDate(value?: Date | string | null) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const { dd, mm, yyyy } = parts(value);
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateValue(value: Date | string | null | undefined, format: DateFormat) {
  const iso = isoDate(value);
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return typeof value === "string" ? value : "";
  return formatDate(new Date(year, month - 1, day), format);
}
