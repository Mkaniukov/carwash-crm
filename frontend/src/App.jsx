import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

import BookingPage from "./pages/public/BookingPage";
import SuccessPage from "./pages/public/SuccessPage";
import CancelPage from "./pages/public/CancelPage";
import Login from "./pages/Login";

import Dashboard from "./pages/owner/Dashboard";
import Services from "./pages/owner/Services";
import Workers from "./pages/owner/Workers";
import Schedule from "./pages/owner/Schedule";
import Settings from "./pages/owner/Settings";

import WorkerDashboard from "./pages/worker/WorkerDashboard";
import CompleteBookingPage from "./pages/worker/CompleteBookingPage";
import WorkerTimePage from "./pages/worker/WorkerTimePage";
import OwnerWorktimePage from "./pages/owner/OwnerWorktimePage";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top center" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/" element={<BookingPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/cancel/:token" element={<CancelPage />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/owner"
              element={
                <ProtectedRoute role="owner">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/services"
              element={
                <ProtectedRoute role="owner">
                  <Services />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/workers"
              element={
                <ProtectedRoute role="owner">
                  <Workers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/schedule"
              element={
                <ProtectedRoute role="owner">
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/settings"
              element={
                <ProtectedRoute role="owner">
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/worktime"
              element={
                <ProtectedRoute role="owner">
                  <OwnerWorktimePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worker"
              element={
                <ProtectedRoute role="worker">
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/worker/booking/:id/complete"
              element={
                <ProtectedRoute role="worker">
                  <CompleteBookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/worker/time"
              element={
                <ProtectedRoute role="worker">
                  <WorkerTimePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
