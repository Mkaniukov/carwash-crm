import { format, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "../ui";

export default function ConfirmStep({
  service,
  selectedDateTime,
  details,
  onConfirm,
  onEditStep,
  loading,
}) {
  const dateTimeValid = selectedDateTime && isValid(selectedDateTime);
  const dateTimeStr = dateTimeValid
    ? format(selectedDateTime, "EEEE, d. MMMM yyyy, HH:mm", { locale: de })
    : "—";

  return (
    <div className="booking-step">
      <h2 className="booking-step__title">Zusammenfassung</h2>
      <div className="confirm-summary card card--padding">
        <div className="confirm-summary__row">
          <span className="confirm-summary__label">Service</span>
          <span className="confirm-summary__value">
            {service?.name} · €{service?.price} · {service?.duration} Min
          </span>
          <Button variant="ghost" size="sm" onClick={() => onEditStep("service")}>
            Ändern
          </Button>
        </div>
        <div className="confirm-summary__row">
          <span className="confirm-summary__label">Termin</span>
          <span className="confirm-summary__value">
            {dateTimeStr}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onEditStep("date")}>
            Ändern
          </Button>
        </div>
        <div className="confirm-summary__row">
          <span className="confirm-summary__label">Kontakt</span>
          <span className="confirm-summary__value">
            {details?.name}, {details?.phone}, {details?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onEditStep("details")}>
            Ändern
          </Button>
        </div>
      </div>
      <Button
        className="confirm-step__submit"
        onClick={onConfirm}
        loading={loading}
        size="lg"
      >
        Termin buchen
      </Button>
    </div>
  );
}
