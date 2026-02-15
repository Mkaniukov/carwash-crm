from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200

def test_create_booking():
    response = client.post("/public/bookings", params={
        "client_name": "Max",
        "phone": "123456",
        "email": "test@test.at",
        "service_id": 1,
        "start_time": "2026-03-02T10:00:00"
    })

    assert response.status_code == 200