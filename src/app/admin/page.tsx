import { AdminPanel } from "@/components/admin/admin-panel";

export default function AdminPage() {
  return (
    <div className="shell" style={{ padding: "1.5rem 0 3rem" }}>
      <h1 style={{ color: "var(--sand)", fontFamily: "var(--font-display)" }}>
        Administração
      </h1>
      <AdminPanel />
    </div>
  );
}
