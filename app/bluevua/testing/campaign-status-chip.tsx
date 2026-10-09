import { Chip } from "@/components/base/badges/chip";

export function CampaignStatusChip({ status }: { status: string }) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "CONCLUDED") return <Chip variant="caption" color="purple">Concluded</Chip>;
  if (["ACTIVE", "ENABLED", "SERVING"].includes(normalized)) return <Chip variant="caption" color="lime">Active</Chip>;
  if (["PAUSED", "CAMPAIGN_PAUSED"].includes(normalized)) return <Chip variant="caption" color="yellow">Paused</Chip>;
  if (["SENT", "COMPLETED"].includes(normalized)) return <Chip variant="caption" color="blue">Sent</Chip>;
  if (["ENDED", "REMOVED", "ARCHIVED"].includes(normalized)) return <Chip variant="caption" color="neutral">Ended</Chip>;
  return <Chip variant="caption" color="soft">{status}</Chip>;
}
