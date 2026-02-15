import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Calendar({ role, serviceId, onSelectSlot }) {
  const [date, setDate] = useState(new Date());
  const [settings, setSettings] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get("/public/settings").then(res => setSettings(res.data));
  }, []);

  useEffect(() => {
    if (!settings) return;

    const formatted = formatDate(date);

    api
      .get(`/public/bookings/by-date?date=${formatted}`)
      .then(res => setBookings(res.data));
  }, [date, settings]);

  if (!settings) return null;

  const workStart = settings.work_start.slice(0, 5);
  const workEnd = settings.work_end.slice(0, 5);

  const slots = generateSlots(workStart, workEnd, 30);

  const duration =  serviceId ? 90 : 30;

  const availableSlots = slots.filter(slot => {
    const slotStart = combine(date, slot);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

    for (const b of bookings) {
      const bookingStart = new Date(b.start_time);
      const bookingEnd = new Date(b.end_time);

      if (
        slotStart < bookingEnd &&
        slotEnd > bookingStart
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={calendarWrapper}>
      {/* LEFT CALENDAR */}
      <div style={calendarBox}>
        <h3>
          {date.toLocaleDateString("de-AT", {
            month: "long",
            year: "numeric"
          })}
        </h3>

        <input
          type="date"
          value={formatDate(date)}
          onChange={(e) =>
            setDate(new Date(e.target.value))
          }
        />
      </div>

      {/* RIGHT SLOTS */}
      <div style={slotsBox}>
        {availableSlots.map((slot, i) => (
          <button
            key={i}
            disabled={!serviceId}
            style={slotButton}
            onClick={() =>
              onSelectSlot(combine(date, slot))
            }
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}

/* HELPERS */

function generateSlots(start, end, interval) {
  const slots = [];
  let [h, m] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  while (h < endH || (h === endH && m < endM)) {
    slots.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
    m += interval;
    if (m >= 60) {
      h++;
      m = 0;
    }
  }

  return slots;
}

function combine(date, time) {
  const [h, m] = time.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h,
    m
  );
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

/* STYLES */

const calendarWrapper = {
  display: "flex",
  gap: 40,
  flexWrap: "wrap"
};

const calendarBox = {
  minWidth: 280,
  padding: 20,
  borderRadius: 12,
  background: "#f1f5f9"
};

const slotsBox = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12
};

const slotButton = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #2563eb",
  background: "white",
  cursor: "pointer"
};