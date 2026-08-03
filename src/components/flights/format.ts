import { formatDuration } from "@/lib/utils/duration";

export function formatPrice(
  amount?: number,
  currency?: string,
  points?: number,
  program?: string,
): string {
  if (points != null) {
    const tax =
      amount != null && currency
        ? ` + ${currency} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "";
    return `${points.toLocaleString("pt-BR")} milhas (${program ?? "programa"})${tax}`;
  }
  if (amount == null) return "—";
  return `${currency ?? "BRL"} ${amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const match = iso.match(/T(\d{2}:\d{2})/);
    return match?.[1] ?? iso;
  }
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export { formatDuration };

export function stopsLabel(stops: number, airports: string[]): string {
  if (stops <= 0) return "Direto";
  if (airports.length > 0) return `${stops} escala(s) via ${airports.join(", ")}`;
  return `${stops} escala(s)`;
}
