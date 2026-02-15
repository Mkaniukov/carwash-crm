import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Public
export const publicApi = {
  getSettings: () => api.get("/public/settings").then((r) => r.data),
  getServices: () => api.get("/public/services").then((r) => r.data),
  getBookingsByDate: (date) =>
    api.get("/public/bookings/by-date", { params: { date } }).then((r) => r.data),
  createBooking: (body) => api.post("/public/bookings", body).then((r) => r.data),
};

// Auth – backend uses OAuth2PasswordRequestForm: form body username + password
export const authApi = {
  login: (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return api
      .post("/auth/login", form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then((r) => r.data);
  },
};

// Owner
export const ownerApi = {
  getAnalytics: () => api.get("/owner/analytics").then((r) => r.data),
  getServices: () => api.get("/owner/services").then((r) => r.data),
  createService: (params) =>
    api.post("/owner/services", null, { params }).then((r) => r.data),
  updateService: (id, params) =>
    api.put(`/owner/services/${id}`, null, { params }).then((r) => r.data),
  deleteService: (id) => api.delete(`/owner/services/${id}`).then((r) => r.data),
  getWorkers: () => api.get("/owner/workers").then((r) => r.data),
  createWorker: (body) => api.post("/owner/workers", body).then((r) => r.data),
  updateWorker: (id, body) => api.put(`/owner/workers/${id}`, body).then((r) => r.data),
  deleteWorker: (id) => api.delete(`/owner/workers/${id}`).then((r) => r.data),
  getBookings: (params) =>
    api.get("/owner/bookings", { params }).then((r) => r.data),
  cancelBooking: (id) =>
    api.post(`/owner/bookings/${id}/cancel`).then((r) => r.data),
  rescheduleBooking: (id, start_time) =>
    api.put(`/owner/bookings/${id}`, { start_time }).then((r) => r.data),
  getSettings: () => api.get("/owner/settings").then((r) => r.data),
  updateSettings: (params) =>
    api.patch("/owner/settings", null, { params }).then((r) => r.data),
};

// Worker
export const workerApi = {
  getBookings: (params) =>
    api.get("/worker/bookings", { params }).then((r) => r.data),
  createBooking: (body) => api.post("/worker/bookings", body).then((r) => r.data),
  cancelBooking: (id) =>
    api.post(`/worker/bookings/${id}/cancel`).then((r) => r.data),
  completeBooking: (id) =>
    api.post(`/worker/bookings/${id}/complete`).then((r) => r.data),
};

export default api;
