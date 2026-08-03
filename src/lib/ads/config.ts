import { getEnv } from "@/lib/utils/env";

export type AdPlacement =
  | "home_top"
  | "home_bottom"
  | "results_top"
  | "results_inline"
  | "footer";

export type AdSlotConfig = {
  id: string;
  placement: AdPlacement;
  enabled: boolean;
  title: string;
  description?: string;
  imageUrl?: string;
  ctaLabel?: string;
  /** Destination URL (opened via /api/go) */
  targetUrl: string;
  partner?: string;
  /** When true, UI shows “Patrocinado / Anúncio” */
  sponsored: boolean;
};

export function adsEnabled(): boolean {
  const raw = getEnv("ADS_ENABLED", "true").toLowerCase();
  return raw !== "false" && raw !== "0";
}

export function getAdSlots(): AdSlotConfig[] {
  if (!adsEnabled()) return [];

  const raw = getEnv("ADS_CONFIG_JSON");
  if (!raw) return defaultDemoSlots();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSlot)
      .filter((s): s is AdSlotConfig => s != null && s.enabled);
  } catch {
    return [];
  }
}

export function getAdSlotsByPlacement(placement: AdPlacement): AdSlotConfig[] {
  return getAdSlots().filter((s) => s.placement === placement);
}

export function getAdSlotById(id: string): AdSlotConfig | undefined {
  return getAdSlots().find((s) => s.id === id);
}

function normalizeSlot(value: unknown): AdSlotConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const id = String(v.id ?? "").trim();
  const placement = String(v.placement ?? "").trim() as AdPlacement;
  const targetUrl = String(v.targetUrl ?? "").trim();
  const title = String(v.title ?? "").trim();
  if (!id || !title || !targetUrl) return null;
  if (!isAllowedPlacement(placement)) return null;
  if (!isSafeHttpUrl(targetUrl)) return null;

  return {
    id,
    placement,
    enabled: v.enabled !== false,
    title,
    description: v.description ? String(v.description) : undefined,
    imageUrl: v.imageUrl ? String(v.imageUrl) : undefined,
    ctaLabel: v.ctaLabel ? String(v.ctaLabel) : "Saiba mais",
    targetUrl,
    partner: v.partner ? String(v.partner) : undefined,
    sponsored: v.sponsored !== false,
  };
}

function isAllowedPlacement(value: string): value is AdPlacement {
  return [
    "home_top",
    "home_bottom",
    "results_top",
    "results_inline",
    "footer",
  ].includes(value);
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Build tracked outbound URL through our redirect. */
export function buildGoUrl(input: {
  to: string;
  placement: string;
  partner?: string;
  slotId?: string;
}): string {
  const params = new URLSearchParams({
    to: input.to,
    placement: input.placement,
  });
  if (input.partner) params.set("partner", input.partner);
  if (input.slotId) params.set("slot", input.slotId);
  return `/api/go?${params.toString()}`;
}

/**
 * Empty by default in production config.
 * Demo slots only when ADS_DEMO=true (local preview).
 */
function defaultDemoSlots(): AdSlotConfig[] {
  if (getEnv("ADS_DEMO", "false").toLowerCase() !== "true") return [];
  return [
    {
      id: "demo-home-top",
      placement: "home_top",
      enabled: true,
      title: "Espaço publicitário (demo)",
      description: "Configure ADS_CONFIG_JSON para anúncios reais.",
      ctaLabel: "Ver política de afiliados",
      targetUrl: "/afiliados",
      partner: "demo",
      sponsored: true,
    },
  ];
}
