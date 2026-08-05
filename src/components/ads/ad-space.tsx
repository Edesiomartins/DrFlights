import { AdSlotCard } from "@/components/ads/ad-slot-card";
import {
  type AdPlacement,
  getAdSlotsByPlacement,
} from "@/lib/ads/config";

type Props = {
  placement: AdPlacement;
  className?: string;
};

export function AdSpace({ placement, className }: Props) {
  const slots = getAdSlotsByPlacement(placement);
  if (slots.length === 0) return null;

  return (
    <div className={`ad-space ${className ?? ""}`}>
      {slots.map((slot) => (
        <AdSlotCard key={slot.id} slot={slot} />
      ))}
    </div>
  );
}
