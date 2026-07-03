import type { Notice } from "@/lib/notices";

export function NoticeBanner({ notice }: { notice?: Notice }) {
  if (!notice) return null;
  return <div className={`module-notice module-notice-${notice.type}`}>{notice.message}</div>;
}
