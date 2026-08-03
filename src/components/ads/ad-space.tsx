import { AdSlotCard } from "@/components/ads/ad-slot-card";
import {
  type AdPlacement,
  getAdSlotsByPlacement,
} from "@/lib/ads/config";

type Props = {
  placement: AdPlacement;
  className?: string;
  style?: React.CSSProperties;
};

export function AdSpace({ placement, className, style }: Props) {
  const slots = getAdSlotsByPlacement(placement);
  if (slots.length === 0) return null;

  return (
    <div className={className} style={{ display: "grid", gap: "0.75rem", ...style }}>
      {slots.map((slot) => (
        <AdSlotCard key={slot.id} slot={slot} />
      ))}
    </div>
  );
}
