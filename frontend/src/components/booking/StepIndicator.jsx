const steps = [
  { key: "service", label: "Service" },
  { key: "date", label: "Datum" },
  { key: "time", label: "Uhrzeit" },
  { key: "details", label: "Kontakt" },
  { key: "confirm", label: "Bestätigung" },
];

export default function StepIndicator({ currentStepName }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStepName);

  return (
    <nav aria-label="Fortschritt der Buchung" className="step-indicator">
      <ol className="step-indicator__list">
        {steps.map((step, i) => {
          const isActive = step.key === currentStepName;
          const isPast = i < currentIndex;
          const isFuture = i > currentIndex;
          return (
            <li
              key={step.key}
              className={`step-indicator__item ${isActive ? "step-indicator__item--active" : ""} ${isPast ? "step-indicator__item--past" : ""} ${isFuture ? "step-indicator__item--future" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="step-indicator__number" aria-hidden>
                {isPast ? "✓" : i + 1}
              </span>
              <span className="step-indicator__label">{step.label}</span>
              {i < steps.length - 1 && (
                <span className="step-indicator__line" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
