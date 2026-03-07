import { useState, useEffect, useMemo } from "react";
import { publicApi } from "../lib/api";
import {
  formatDate,
  generateTimeSlots,
  combineDateAndTime,
  addDuration,
  isWorkingDay,
  getDayHours,
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
        if (!cancelled) setBookings(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBookings([]);
      });
    return () => { cancelled = true; };
  }, [settings, date]);

  const slots = useMemo(() => {
    if (!settings || !date) return [];
    const dayHours = getDayHours(settings, date);
    if (!dayHours) return [];
    return generateTimeSlots(dayHours.start, dayHours.end, 30);
  }, [settings, date]);

  const duration = service?.duration ?? 30;

  const availableSlots = useMemo(() => {
    if (!date || !settings) return [];
    if (!isWorkingDay(date, settings)) return [];
    const dayHours = getDayHours(settings, date);
    if (!dayHours) return [];
    const now = new Date();
    const bufferMinutes = 2;
    const minStart = new Date(now.getTime() - bufferMinutes * 60 * 1000);
    // End of working day on the selected date (slot must finish before or at this time)
    const workEndToday = combineDateAndTime(date, dayHours.end);
    return slots.filter((timeStr) => {
      const slotStart = combineDateAndTime(date, timeStr);
      if (slotStart < minStart) return false;
      const slotEnd = addDuration(slotStart, duration);
      if (slotEnd > workEndToday) return false; // service would end after shift end
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
