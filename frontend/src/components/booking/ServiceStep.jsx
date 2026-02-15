import { useState } from "react";

export default function ServiceStep({ services, selected, onSelect }) {
  const [expandedId, setExpandedId] = useState(null);
  const list = Array.isArray(services) ? services : [];

  if (!list.length) {
    return (
      <div className="booking-empty">
        <p>Keine Services verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="booking-step">
      <h2 className="booking-step__title">Wählen Sie einen Service</h2>
      <div className="service-grid" role="listbox" aria-label="Services">
        {list.map((s) => {
          const isExpanded = expandedId === s.id;
          const hasDescription = s.description?.trim();
          return (
            <div key={s.id} className="service-card-wrapper">
              <button
                type="button"
                role="option"
                aria-selected={selected?.id === s.id}
                aria-expanded={hasDescription ? isExpanded : undefined}
                className={`service-card ${selected?.id === s.id ? "service-card--selected" : ""}`}
                onClick={() => onSelect(s)}
              >
                <span className="service-card__name">{s.name}</span>
                <span className="service-card__meta">
                  {s.duration} Min · €{s.price}
                </span>
                {hasDescription && (
                  <span className={`service-card__description ${isExpanded ? "service-card__description--full" : ""}`}>
                    {s.description.trim()}
                  </span>
                )}
                {hasDescription && (
                  <span
                    className="service-card__details-link"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : s.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : s.id);
                      }
                    }}
                  >
                    {isExpanded ? "Weniger" : "Mehr erfahren"}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
