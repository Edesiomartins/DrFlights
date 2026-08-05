import { AlertsClient } from "@/components/alerts/alerts-client";

export default function AlertasPage() {
  return (
    <div className="shell page-shell">
      <h1 className="page-title">
        Alertas de preço
      </h1>
      <AlertsClient />
    </div>
  );
}
