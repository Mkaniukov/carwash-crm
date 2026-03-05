"""
Working hours per weekday. When hours_per_day is set, use it; else fall back to work_start/work_end/working_days.
"""
from datetime import time
import json


def _parse_time(s):
    if not s or not isinstance(s, str):
        return None
    parts = s.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        h = int(parts[0])
        m = int(parts[1].split(".")[0])
        if 0 <= h <= 23 and 0 <= m <= 59:
            return time(h, m)
    except (ValueError, IndexError):
        pass
    return None


def get_work_hours_for_weekday(settings, weekday):
    """
    weekday: 0=Monday ... 6=Sunday (Python convention).
    Returns (start_time, end_time) for that day, or None if closed.
    """
    raw = getattr(settings, "hours_per_day", None)
    if raw:
        try:
            data = json.loads(raw) if isinstance(raw, str) else raw
            if isinstance(data, dict):
                key = str(weekday)
                day = data.get(key)
                if isinstance(day, dict):
                    start = _parse_time(day.get("start"))
                    end = _parse_time(day.get("end"))
                    if start is not None and end is not None and start < end:
                        return (start, end)
                elif day is None or (isinstance(day, dict) and (day.get("start") is None or day.get("end") is None)):
                    return None
        except (json.JSONDecodeError, TypeError):
            pass

    # Fallback: work_start, work_end, working_days
    allowed = getattr(settings, "working_days", None) or "0,1,2,3,4"
    try:
        allowed_list = [int(x.strip()) for x in allowed.split(",") if x.strip()]
    except (ValueError, AttributeError):
        allowed_list = [0, 1, 2, 3, 4]
    if weekday not in allowed_list:
        return None
    start = getattr(settings, "work_start", None)
    end = getattr(settings, "work_end", None)
    if start is None or end is None:
        return None
    if not isinstance(start, time):
        start = _parse_time(str(start)[:5]) if start else None
    if not isinstance(end, time):
        end = _parse_time(str(end)[:5]) if end else None
    if start is None or end is None:
        return None
    return (start, end)
