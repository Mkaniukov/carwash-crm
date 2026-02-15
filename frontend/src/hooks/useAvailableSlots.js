import { useState, useEffect, useMemo } from "react";
import { publicApi } from "../lib/api";
import {
  formatDate,
  generateTimeSlots,
  combineDateAndTime,
  addDuration,
  isWorkingDay,
} from "../utils/date";
import { getErrorMessage } from "../utils/error";

export function useAvailableSlots(date, service) {
  const [settings, setSettings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    publicApi
      .getSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Einstellungen konnten nicht geladen werden."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!settings || !date) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    const d = formatDate(date);
    publicApi
      .getBookingsByDate(d)
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      });
    return () => { cancelled = true; };
  }, [settings, date]);

  const slots = useMemo(() => {
    if (!settings) return [];
    const start = settings.work_start?.slice(0, 5) || "09:00";
    const end = settings.work_end?.slice(0, 5) || "18:00";
    return generateTimeSlots(start, end, 30);
  }, [settings]);

  const duration = service?.duration ?? 30;

  const availableSlots = useMemo(() => {
    if (!date || !settings) return [];
    if (!isWorkingDay(date, settings)) return [];
    return slots.filter((timeStr) => {
      const slotStart = combineDateAndTime(date, timeStr);
      const slotEnd = addDuration(slotStart, duration);
      for (const b of bookings) {
        const bookingStart = new Date(b.start_time);
        const bookingEnd = new Date(b.end_time);
        if (slotStart < bookingEnd && slotEnd > bookingStart) return false;
      }
      return true;
    });
  }, [date, settings, slots, bookings, duration]);

  return { settings, slots: availableSlots, loading, error };
}
