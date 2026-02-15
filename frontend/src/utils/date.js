import {
  format,
  addMinutes,
  startOfDay,
  isSameDay,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";

export const locale = de;

export function formatDate(d) {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "yyyy-MM-dd");
}

export function formatTime(d) {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "HH:mm");
}

export function formatDateTime(d) {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "dd.MM.yyyy HH:mm", { locale });
}

export function formatDateLong(d) {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, "EEEE, d. MMMM yyyy", { locale });
}

export function toLocalISOString(date) {
  if (typeof date === "string") return date;
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

export function combineDateAndTime(date, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h,
    m
  );
}

export function generateTimeSlots(startStr, endStr, intervalMinutes = 30) {
  const slots = [];
  let [h, m] = startStr.slice(0, 5).split(":").map(Number);
  const [endH, endM] = endStr.slice(0, 5).split(":").map(Number);

  while (h < endH || (h === endH && m < endM)) {
    slots.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
    m += intervalMinutes;
    if (m >= 60) {
      h++;
      m = 0;
    }
  }
  return slots;
}

export function addDuration(date, minutes) {
  return addMinutes(date, minutes);
}

/**
 * Weekday convention: 1 = Monday, 7 = Sunday (matches JS getDay() with Sun → 7).
 * Backend may send working_days as:
 * - Array [1,2,3,4,5] (1-indexed, Mon–Fri), or
 * - String "0,1,2,3,4" (0-indexed: 0=Mon … 6=Sun) → we normalize to 1-indexed so Friday (4) → 5.
 * Default when missing: Mon–Fri [1,2,3,4,5].
 */
function normalizeWorkingDays(working_days) {
  const defaultDays = [1, 2, 3, 4, 5]; // Mon–Fri
  if (working_days == null) return defaultDays;
  let arr;
  if (typeof working_days === "string") {
    arr = working_days.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
  } else if (Array.isArray(working_days)) {
    arr = [...working_days];
  } else {
    return defaultDays;
  }
  if (arr.length === 0) return defaultDays;
  // Backend uses 0=Mon … 6=Sun; we use 1=Mon … 7=Sun. If any value is 0–6, treat as 0-indexed.
  const hasZeroIndexed = arr.some((n) => n >= 0 && n <= 6);
  if (hasZeroIndexed) {
    arr = arr.map((n) => (n === 6 ? 7 : n + 1)); // 0→1, 1→2, …, 5→6, 6→7
  }
  return arr.length ? arr : defaultDays;
}

export function isWorkingDay(date, settings) {
  if (!settings) return true;
  const d = typeof date === "string" ? parseISO(date) : date;
  const weekday = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon … 7=Sun
  const workingDays = normalizeWorkingDays(settings.working_days);
  if (!workingDays.includes(weekday)) return false;
  const dateStr = format(d, "yyyy-MM-dd");
  const daysOff = settings.days_off ?? [];
  return !daysOff.includes(dateStr);
}

export { isToday, isTomorrow, isSameDay, startOfDay, parseISO };
