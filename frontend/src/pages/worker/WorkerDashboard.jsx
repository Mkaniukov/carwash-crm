import { useEffect, useState } from "react";
import { format, addDays, startOfWeek, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { Card, Button, Modal, Input } from "../../components/ui";
import { workerApi, publicApi } from "../../lib/api";
import { getErrorMessage } from "../../utils/error";
import { toLocalISOString } from "../../utils/date";
import { useAvailableSlots } from "../../hooks/useAvailableSlots";

function isActiveBooking(b) {
  const s = (b.status || "").toLowerCase();
  return s !== "canceled_by_staff" && s !== "canceled_by_client" && s !== "completed";
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
    const [h, m] = timeStr.split(":").map(Number);
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
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [manualSlot, setManualSlot] = useState(null);
  const [manualServiceId, setManualServiceId] = useState(null);
  const [manualClient, setManualClient] = useState("Walk-In");
  const [saving, setSaving] = useState(false);

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

  const completeBooking = async (id) => {
    try {
      await workerApi.completeBooking(id);
      toast.success("Als erledigt markiert.");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Fehler."));
    }
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
    bookingsByDay[key] = (bookings || []).filter((b) => {
      if (isCanceled(b)) return false;
      const start = new Date(b.start_time);
      return format(start, "yyyy-MM-dd") === key;
    });
  });

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
                {(bookingsByDay[format(day, "yyyy-MM-dd")] || []).length === 0 ? (
                  <p className="schedule-day__empty">Keine Termine</p>
                ) : (
                  (bookingsByDay[format(day, "yyyy-MM-dd")] || []).map((b) => (
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
                      <div className="schedule-booking__actions">
                        {isActiveBooking(b) && (
                          <>
                            <Button size="sm" onClick={() => completeBooking(b.id)}>Erledigt</Button>
                            <Button variant="danger" size="sm" onClick={() => cancelBooking(b.id)}>Stornieren</Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
    </Layout>
  );
}
