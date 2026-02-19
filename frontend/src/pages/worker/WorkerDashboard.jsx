import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Modal, Input } from "../../components/ui";
import { workerApi, publicApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";
import { toLocalISOString } from "../../utils/date";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";

function isBooked(b) {
  const s = (b.status || "").toLowerCase();
  return s === "booked" || s === "confirmed";
}
function isCheckedIn(b) {
  const s = (b.status || "").toLowerCase();
  return s === "checked_in";
}
function isPaid(b) {
  const s = (b.status || "").toLowerCase();
  return s === "paid" || s === "completed";
}
function isActiveBooking(b) {
  return isBooked(b) || isCheckedIn(b);
}

function WorkerCalendar({ services, onSlotSelect }) {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [serviceId, setServiceId] = useState(services?.[0]?.id ?? null);
  const { slots, loading } = useAvailableSlots(date, services?.find((s) => s.id === serviceId));

  useEffect(() => {
    const from = format(date, "yyyy-MM-dd");
    const to = from;
    workerApi
      .getBookings({ from, to })
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]));
  }, [date]);

  const handleSlot = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return;
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
    onSlotSelect(d, serviceId);
  };

  return (
    <div className="worker-calendar">
      <div className="date-step__nav" style={{ marginBottom: 16 }}>
        <input
          type="date"
          className="input-field"
          value={format(date, "yyyy-MM-dd")}
          onChange={(e) => setDate(new Date(e.target.value))}
        />
      </div>
      {services?.length > 0 && (
        <select
          className="input-field"
          value={serviceId || ""}
          onChange={(e) => setServiceId(Number(e.target.value))}
          style={{ marginBottom: 16, width: "100%" }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name} · {s.duration} Min</option>
          ))}
        </select>
      )}
      {loading ? (
        <p className="text-muted">Lade Zeiten…</p>
      ) : (
        <div className="time-step__slots">
          {slots.map((t) => (
            <button
              key={t}
              type="button"
              className="time-slot"
              onClick={() => handleSlot(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [manualSlot, setManualSlot] = useState(null);
  const [manualServiceId, setManualServiceId] = useState(null);
  const [manualClient, setManualClient] = useState("Walk-In");
  const [saving, setSaving] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null); // { id, final_price }
  const [paySaving, setPaySaving] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const load = () => {
    const from = format(weekStart, "yyyy-MM-dd");
    const to = format(addDays(weekStart, 6), "yyyy-MM-dd");
    setLoading(true);
    Promise.all([
      workerApi.getBookings({ from, to }).then((data) => Array.isArray(data) ? data : data?.bookings ?? []),
      publicApi.getServices().catch(() => []),
    ])
      .then(([b, s]) => {
        setBookings(b);
        setServices(Array.isArray(s) ? s : []);
      })
      .catch(() => {
        toast.error("Termine konnten nicht geladen werden.");
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [weekStart]);

  const cancelBooking = async (id) => {
    if (!window.confirm("Termin wirklich stornieren?")) return;
    try {
      await workerApi.cancelBooking(id);
      toast.success("Termin storniert.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Stornierung fehlgeschlagen."));
    }
  };

  const openCompleteForm = (bookingId) => {
    navigate(`/worker/booking/${bookingId}/complete`);
  };

  const openManual = (date, serviceId) => {
    setManualSlot(date);
    setManualServiceId(serviceId);
    setManualClient("Walk-In Kunde");
    setModalOpen(true);
  };

  const submitManual = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!manualSlot || !manualServiceId) {
      toast.error("Bitte wählen Sie zuerst ein Datum und eine Uhrzeit im Kalender.");
      return;
    }
    setSaving(true);
    try {
      await workerApi.createBooking({
        start_time: toLocalISOString(manualSlot),
        service_id: manualServiceId,
        client_name: manualClient,
        phone: "—",
      });
      toast.success("Termin angelegt.");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Fehler beim Anlegen."));
    } finally {
      setSaving(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isCanceled = (b) => {
    const s = (b.status || "").toLowerCase();
    return s === "canceled_by_staff" || s === "canceled_by_client";
  };

  const bookingsByDay = {};
  weekDays.forEach((d) => {
    const key = format(d, "yyyy-MM-dd");
    const dayBookings = (bookings || []).filter((b) => {
      if (isCanceled(b)) return false;
      const start = new Date(b.start_time);
      return format(start, "yyyy-MM-dd") === key;
    });
    bookingsByDay[key] = {
      booked: dayBookings.filter(isBooked),
      checked_in: dayBookings.filter(isCheckedIn),
      paid: dayBookings.filter(isPaid),
    };
  });

  const openPayment = (b) => {
    setPaymentModal({ id: b.id, final_price: b.final_price ?? b.service_price });
    setPayAmount(String(b.final_price ?? b.service_price ?? ""));
    setPayMethod("cash");
  };

  const submitPayment = async () => {
    if (!paymentModal) return;
    const amount = parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Bitte gültigen Betrag eingeben.");
      return;
    }
    setPaySaving(true);
    try {
      await workerApi.payBooking(paymentModal.id, { amount, payment_method: payMethod });
      toast.success("Zahlung erfasst.");
      setPaymentModal(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Zahlung fehlgeschlagen."));
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <Layout role="worker">
      <div className="page-header">
        <h1 className="page-title">Termine</h1>
      </div>

      <Card className="schedule-toolbar" style={{ marginBottom: 16 }}>
        <div className="schedule-toolbar__nav">
          <Button variant="ghost" size="sm" onClick={prevWeek}>←</Button>
          <span className="schedule-toolbar__range">
            {format(weekStart, "d. MMM", { locale: de })} – {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: de })}
          </span>
          <Button variant="ghost" size="sm" onClick={nextWeek}>→</Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Heute</Button>
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-muted">Lade Termine…</p></Card>
      ) : (
        <div className="schedule-grid" style={{ marginBottom: 24 }}>
          {weekDays.map((day) => (
            <Card key={day.toISOString()} className="schedule-day">
              <h3 className={`schedule-day__title ${isToday(day) ? "schedule-day__title--today" : ""}`}>
                {format(day, "EEEE, d.", { locale: de })}
              </h3>
              <div className="schedule-day__list">
                {(() => {
                  const dayData = bookingsByDay[format(day, "yyyy-MM-dd")] || { booked: [], checked_in: [], paid: [] };
                  const hasAny = dayData.booked.length + dayData.checked_in.length + dayData.paid.length > 0;
                  if (!hasAny) return <p className="schedule-day__empty">Keine Termine</p>;
                  const renderCard = (b, actions) => (
                    <div key={b.id} className="schedule-booking">
                      <div className="schedule-booking__time">
                        {format(new Date(b.start_time), "HH:mm")} – {format(new Date(b.end_time), "HH:mm")}
                      </div>
                      <div className="schedule-booking__name">{b.client_name}</div>
                      <div className="schedule-booking__meta">{b.service_name || `Service #${b.service_id}`}</div>
                      {(b.phone || b.email) && (
                        <div className="schedule-booking__contact">
                          {b.phone && <span>📞 {b.phone}</span>}
                          {b.phone && b.email && " · "}
                          {b.email && <span>✉ {b.email}</span>}
                        </div>
                      )}
                      {actions && <div className="schedule-booking__actions">{actions}</div>}
                    </div>
                  );
                  return (
                    <>
                      {dayData.booked.length > 0 && (
                        <div className="schedule-day__block">
                          <div className="schedule-day__block-title">Geplant</div>
                          {dayData.booked.map((b) => renderCard(b, (
                            <>
                              <Button size="sm" onClick={() => openCompleteForm(b.id)}>Formular ausfüllen</Button>
                              <Button variant="danger" size="sm" onClick={() => cancelBooking(b.id)}>Stornieren</Button>
                            </>
                          )))}
                        </div>
                      )}
                      {dayData.checked_in.length > 0 && (
                        <div className="schedule-day__block">
                          <div className="schedule-day__block-title">Unterschrieben / In Arbeit</div>
                          {dayData.checked_in.map((b) => renderCard(b, (
                            <>
                              <Button size="sm" onClick={() => openPayment(b)}>Zur Zahlung</Button>
                              <Button variant="danger" size="sm" onClick={() => cancelBooking(b.id)}>Stornieren</Button>
                            </>
                          )))}
                        </div>
                      )}
                      {dayData.paid.length > 0 && (
                        <div className="schedule-day__block">
                          <div className="schedule-day__block-title">Bezahlt</div>
                          {dayData.paid.map((b) => renderCard(b, null))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h3 className="schedule-day__title">Termin anlegen</h3>
        <WorkerCalendar services={services} onSlotSelect={openManual} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Manuellen Termin anlegen"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button
              type="button"
              loading={saving}
              onClick={() => submitManual()}
            >
              Anlegen
            </Button>
          </>
        }
      >
        {manualSlot && (
          <div>
            <p><strong>Datum/Zeit:</strong> {format(manualSlot, "dd.MM.yyyy HH:mm", { locale: de })}</p>
            <Input
              label="Kundenname"
              value={manualClient}
              onChange={(e) => setManualClient(e.target.value)}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title="Zur Zahlung"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Abbrechen</Button>
            <Button type="button" loading={paySaving} onClick={submitPayment}>Zahlung erfassen</Button>
          </>
        }
      >
        {paymentModal && (
          <div>
            <Input
              label="Betrag (€)"
              type="number"
              step="0.01"
              min="0"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <div className="checkin-form__row" style={{ marginTop: 12 }}>
              <label className="input-label">Zahlungsart</label>
              <select
                className="input-field"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="cash">Bar</option>
                <option value="card">Karte</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
