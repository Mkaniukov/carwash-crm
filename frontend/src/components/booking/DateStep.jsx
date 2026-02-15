import { useState } from "react";
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, isSameMonth, isSameDay, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { isWorkingDay } from "../../utils/date";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function DateStep({ selected, onSelect, minDate, settings }) {
  const [viewMonth, setViewMonth] = useState(selected || minDate || new Date());

  const start = startOfMonth(viewMonth);
  const end = endOfMonth(viewMonth);
  const startCal = startOfWeek(start, { weekStartsOn: 1 });
  const endCal = endOfWeek(end, { weekStartsOn: 1 });
  const days = [];
  let d = startCal;
  while (d <= endCal) {
    days.push(d);
    d = addDays(d, 1);
  }

  const canGoPrev = addMonths(viewMonth, -1) >= (minDate || new Date());

  return (
    <div className="booking-step">
      <h2 className="booking-step__title">Datum wählen</h2>
      <div className="date-step__nav">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          disabled={!canGoPrev}
          aria-label="Vorheriger Monat"
        >
          ←
        </button>
        <span className="date-step__month" aria-live="polite">
          {format(viewMonth, "MMMM yyyy", { locale: de })}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Nächster Monat"
        >
          →
        </button>
      </div>
      <div className="date-step__weekdays">
        {WEEKDAYS.map((day) => (
          <span key={day} className="date-step__weekday">
            {day}
          </span>
        ))}
      </div>
      <div className="date-step__grid">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const selectedDay = selected && isSameDay(day, selected);
          const dayStart = startOfDay(day);
          const todayStart = startOfDay(new Date());
          const isPast = dayStart < todayStart;
          const working = isWorkingDay(day, settings ?? {});
          const disabled = isPast || !inMonth || !working;
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={`date-step__day ${!inMonth ? "date-step__day--other" : ""} ${!working ? "date-step__day--nonworking" : ""} ${isToday(day) ? "date-step__day--today" : ""} ${selectedDay ? "date-step__day--selected" : ""}`}
              disabled={disabled}
              onClick={() => !disabled && onSelect(day)}
              aria-pressed={selectedDay}
              aria-label={format(day, "d. MMMM yyyy", { locale: de })}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
