import type { ActivityStatus } from "@/lib/types";
import { statusLabels } from "@/lib/labels";

export function StatusBadge({ label, status }: { label?: string; status: ActivityStatus }) {
  return <span className={`badge ${status}`}>{label ?? statusLabels[status]}</span>;
}
