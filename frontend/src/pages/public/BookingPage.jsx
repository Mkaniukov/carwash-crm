import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { publicApi } from "../../lib/api";
import { useBookingState } from "../../hooks/useBookingState";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";
import { toLocalISOString } from "../../utils/date";
import { getErrorMessage } from "../../utils/error";
import StepIndicator from "../../components/booking/StepIndicator";
import ServiceStep from "../../components/booking/ServiceStep";
import DateStep from "../../components/booking/DateStep";
import TimeStep from "../../components/booking/TimeStep";
import DetailsStep from "../../components/booking/DetailsStep";
import ConfirmStep from "../../components/booking/ConfirmStep";
import { Button } from "../../components/ui";

export default function BookingPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const booking = useBookingState();
  const { date, service, time, details, selectedDateTime } = booking;
  const { settings, slots, loading: slotsLoading } = useAvailableSlots(date, service);

  const loadServices = useCallback(() => {
    setLoadingServices(true);
    publicApi
      .getServices()
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => loadServices(), [loadServices]);

  const handleConfirm = useCallback(async () => {
    if (!service || !selectedDateTime || !details.name || !details.phone || !details.email) return;
    setSubmitting(true);
    try {
      const startTime = toLocalISOString(selectedDateTime);
      const res = await publicApi.createBooking({
        service_id: service.id,
        start_time: startTime,
        client_name: details.name,
        phone: details.phone,
        email: details.email,
      });
      navigate("/success", {
        state: {
          bookingId: res?.id ?? res?.booking_id ?? "—",
          client_name: details.name,
          phone: details.phone,
          email: details.email,
          serviceName: service.name,
          servicePrice: service.price,
          serviceDuration: service.duration,
          date: startTime,
        },
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Buchung fehlgeschlagen."));
    } finally {
      setSubmitting(false);
    }
  }, [service, selectedDateTime, details, navigate]);

  const goToStepIndex = (stepName) => {
    const i = booking.steps.indexOf(stepName);
    if (i >= 0) booking.goToStep(i);
  };

  if (loadingServices) {
    return (
      <div className="booking-page">
        <div className="booking-page__inner">
          <div className="booking-page__logo">Carwash</div>
          <div className="card card--padding">
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>Services werden geladen…</p>
            <p className="text-muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>
              Bei der ersten Anfrage kann es bis zu einer Minute dauern.
            </p>
          </div>
        </div>
        <Toaster position="top center" />
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="booking-page">
        <div className="booking-page__inner">
          <div className="booking-page__logo">Carwash</div>
          <div className="card card--padding">
            <p style={{ margin: 0 }}>Services konnten nicht geladen werden.</p>
            <p className="text-muted" style={{ marginTop: 8 }}>Antwort dauert länger oder Server nicht erreichbar.</p>
            <Button className="booking-page__retry" onClick={loadServices} aria-label="Services erneut laden">
              Erneut versuchen
            </Button>
          </div>
        </div>
        <Toaster position="top center" />
      </div>
    );
  }

  return (
    <div className="booking-page">
      <a href="#main" className="skip-link">Zum Inhalt springen</a>
      <Toaster position="top center" toastOptions={{ duration: 4000 }} />
      <div className="booking-page__inner">
        <h1 className="booking-page__logo" id="main">Carwash</h1>
        <StepIndicator currentStepName={booking.stepName} />

        {booking.stepName === "service" && (
          <ServiceStep
            services={services}
            selected={service}
            onSelect={(s) => {
              booking.setService(s);
              booking.goNext();
            }}
          />
        )}

        {booking.stepName === "date" && (
          <DateStep
            selected={date}
            onSelect={(d) => {
              booking.setDate(d);
              booking.setTime(null);
              booking.goNext();
            }}
            minDate={new Date()}
            settings={settings}
          />
        )}

        {booking.stepName === "time" && (
          <TimeStep
            date={date}
            slots={slots}
            loading={slotsLoading}
            selectedTime={time}
            onSelect={(t) => {
              booking.setTime(t);
              booking.goNext();
            }}
          />
        )}

        {booking.stepName === "details" && (
          <DetailsStep
            details={details}
            setDetails={booking.setDetails}
            onSubmit={booking.goNext}
            loading={false}
          />
        )}

        {booking.stepName === "confirm" && (
          <ConfirmStep
            service={service}
            selectedDateTime={selectedDateTime}
            details={details}
            onConfirm={handleConfirm}
            onEditStep={goToStepIndex}
            loading={submitting}
          />
        )}

        {booking.canGoBack && booking.stepName !== "confirm" && (
          <div className="booking-nav">
            <Button variant="ghost" onClick={booking.goBack} aria-label="Schritt zurück">
              ← Zurück
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
