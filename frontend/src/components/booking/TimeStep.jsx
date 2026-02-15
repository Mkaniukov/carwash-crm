import { Skeleton } from "../ui";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function TimeStep({
  date,
  slots,
  loading,
  error,
  selectedTime,
  onSelect,
}) {
  if (loading) {
    return (
      <div className="booking-step">
        <h2 className="booking-step__title">Uhrzeit wählen</h2>
        <div className="time-step__slots time-step__slots--loading">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={44} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-step">
        <h2 className="booking-step__title">Uhrzeit wählen</h2>
        <p className="booking-step__error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="booking-step">
      <h2 className="booking-step__title">
        Uhrzeit für {date ? format(date, "EEEE, d. MMMM", { locale: de }) : ""}
      </h2>
      {!slots?.length ? (
        <p className="booking-step__empty">Keine freien Zeiten an diesem Tag.</p>
      ) : (
        <div className="time-step__slots" role="listbox" aria-label="Verfügbare Zeiten">
          {slots.map((timeStr) => (
            <button
              key={timeStr}
              type="button"
              role="option"
              aria-selected={selectedTime === timeStr}
              className={`time-slot ${selectedTime === timeStr ? "time-slot--selected" : ""}`}
              onClick={() => onSelect(timeStr)}
            >
              {timeStr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
