import { AdminPanel } from "@/components/admin/admin-panel";

export default function AdminPage() {
  return (
    <div className="shell page-shell">
      <h1 className="page-title">
        Administração
      </h1>
      <AdminPanel />
    </div>
  );
}
