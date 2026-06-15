import type { ActivityStatus } from "@/lib/types";
import { statusLabels } from "@/lib/labels";

export function StatusBadge({ status }: { status: ActivityStatus }) {
  return <span className={`badge ${status}`}>{statusLabels[status]}</span>;
}
