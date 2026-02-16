"""Simple in-memory rate limit for public booking (per IP)."""
from collections import defaultdict
from time import time
from fastapi import Request, HTTPException

# ip -> list of timestamps (last 60 seconds)
_booking_attempts = defaultdict(list)
_WINDOW = 60  # seconds
_MAX_PER_WINDOW = 20


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host or "unknown"


def check_booking_rate_limit(request: Request) -> None:
    ip = get_client_ip(request)
    now = time()
    # keep only last window
    _booking_attempts[ip] = [t for t in _booking_attempts[ip] if now - t < _WINDOW]
    if len(_booking_attempts[ip]) >= _MAX_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    _booking_attempts[ip].append(now)
