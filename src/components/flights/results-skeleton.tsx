export function ResultsSkeleton() {
  return (
    <div className="results-skeleton" aria-busy="true" aria-live="polite">
      <div className="glass skeleton-panel skeleton-summary">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-chips">
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
          <div className="skeleton-chip" />
        </div>
        <div className="skeleton-line skeleton-copy-wide" />
        <div className="skeleton-line skeleton-copy" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="glass skeleton-panel skeleton-offer"
        >
          <div className="skeleton-offer-head">
            <div className="skeleton-line skeleton-airline" />
            <div className="skeleton-line skeleton-price" />
          </div>
          <div className="skeleton-line skeleton-route" />
          <div className="skeleton-line skeleton-copy" />
        </div>
      ))}
      <p className="skeleton-status">
        Consultando fornecedores em paralelo…
      </p>
    </div>
  );
}
