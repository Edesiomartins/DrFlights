export function ResultsSkeleton() {
  return (
    <div
      className="results-skeleton"
      aria-busy="true"
      aria-live="polite"
      style={{ display: "grid", gap: "1.25rem" }}
    >
      <div className="glass skeleton-panel" style={{ borderRadius: "1.25rem", padding: "1.25rem" }}>
        <div className="skeleton-line" style={{ width: "55%", height: 28, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
        </div>
        <div className="skeleton-line" style={{ width: "90%", height: 14, marginBottom: 8 }} />
        <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="glass skeleton-panel"
          style={{ borderRadius: "1.25rem", padding: "1.1rem 1.2rem", display: "grid", gap: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div className="skeleton-line" style={{ width: "40%", height: 22 }} />
            <div className="skeleton-line" style={{ width: "22%", height: 22 }} />
          </div>
          <div className="skeleton-line" style={{ width: "100%", height: 64, borderRadius: 14 }} />
          <div className="skeleton-line" style={{ width: "65%", height: 14 }} />
        </div>
      ))}
      <p style={{ color: "var(--sand)", margin: 0, opacity: 0.85, fontSize: "0.95rem" }}>
        Consultando fornecedores em paralelo…
      </p>
    </div>
  );
}
