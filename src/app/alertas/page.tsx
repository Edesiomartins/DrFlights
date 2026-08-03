import { AlertsClient } from "@/components/alerts/alerts-client";

export default function AlertasPage() {
  return (
    <div className="shell" style={{ padding: "1.5rem 0 3rem" }}>
      <h1 style={{ color: "var(--sand)", fontFamily: "var(--font-display)" }}>
        Alertas de preço
      </h1>
      <AlertsClient />
    </div>
  );
}
