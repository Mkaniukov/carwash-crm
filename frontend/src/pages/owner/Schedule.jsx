import { useEffect, useState } from "react";
import { format, addDays, startOfWeek, isSameWeek, isToday } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { getErrorMessage } from "../../utils/error";
import { Card, Button } from "../../components/ui";
import { ownerApi } from "../../lib/api";
import { formatDateTime } from "../../utils/date";

export default function Schedule() {
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerFilter, setWorkerFilter] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState(true);

  const loadBookings = () => {
    const from = format(weekStart, "yyyy-MM-dd");
    const to = format(addDays(weekStart, 6), "yyyy-MM-dd");
    setLoading(true);
    const params = { from, to };
    if (workerFilter) params.worker_id = workerFilter;
    ownerApi
      .getBookings(params)
      .then((data) => setBookings(Array.isArray(data) ? data : data?.bookings ?? []))
      .catch(() => {
        toast.error("Termine konnten nicht geladen werden.");
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    ownerApi.getWorkers().then(setWorkers).catch(() => setWorkers([]));
  }, []);

  useEffect(() => loadBookings(), [weekStart, workerFilter]);

  const cancelBooking = async (id) => {
    if (id == null || id === undefined) return;
    if (!window.confirm("Termin wirklich stornieren?")) return;
    try {
      await ownerApi.cancelBooking(id);
      toast.success("Termin storniert.");
      loadBookings();
    } catch (err) {
      toast.error(getErrorMessage(err, "Stornierung fehlgeschlagen."));
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isCanceled = (b) => (b.status || "").toLowerCase() === "cancelled";

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
    <Layout role="owner">
      <div className="page-header">
        <h1 className="page-title">Termine</h1>
      </div>

      <Card className="schedule-toolbar">
        <div className="schedule-toolbar__nav">
          <Button variant="ghost" size="sm" onClick={prevWeek}>←</Button>
          <span className="schedule-toolbar__range">
            {format(weekStart, "d. MMM", { locale: de })} – {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: de })}
          </span>
          <Button variant="ghost" size="sm" onClick={nextWeek}>→</Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Heute</Button>
        </div>
        <div className="schedule-toolbar__filter">
          <label htmlFor="worker-filter">Mitarbeiter</label>
          <select
            id="worker-filter"
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="input-field"
            style={{ width: "auto", minWidth: 160 }}
          >
            <option value="">Alle</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.username}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <Card><p className="text-muted">Lade Termine…</p></Card>
      ) : (
        <div className="schedule-grid">
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
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="schedule-booking__cancel"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelBooking(b.id);
                        }}
                      >
                        Stornieren
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
