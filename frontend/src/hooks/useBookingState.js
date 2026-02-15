import { useState, useCallback } from "react";

const STEPS = ["service", "date", "time", "details", "confirm"];

export function useBookingState() {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "" });

  const currentStepName = STEPS[step];
  const canGoBack = step > 0;
  const isLastStep = step === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const goToStep = useCallback((index) => {
    setStep(Math.max(0, Math.min(index, STEPS.length - 1)));
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setService(null);
    setDate(null);
    setTime(null);
    setDetails({ name: "", phone: "", email: "" });
  }, []);

  const selectedDateTime =
    date && time
      ? (() => {
          const [h, m] = time.split(":").map(Number);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
        })()
      : null;

  return {
    step,
    stepName: currentStepName,
    steps: STEPS,
    canGoBack,
    isLastStep,
    goNext,
    goBack,
    goToStep,
    reset,
    service,
    setService,
    date,
    setDate,
    time,
    setTime,
    details,
    setDetails,
    selectedDateTime,
  };
}
