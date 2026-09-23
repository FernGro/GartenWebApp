"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/actions/run-action";

const ActionPendingContext = createContext(false);

export function useActionPending() {
  return useContext(ActionPendingContext);
}

type ActionFormProps = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
};

// Submits without React's automatic form reset, so a rejected entry keeps what the person typed.
export function ActionForm({ action, children, className, successMessage = "Gespeichert" }: ActionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(form, submitter);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await action(formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      if (result && "redirectTo" in result) {
        router.push(result.redirectTo);
        return;
      }
      form.reset();
      setSaved(true);
      timer.current = setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <ActionPendingContext.Provider value={pending}>{children}</ActionPendingContext.Provider>
      {error ? (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {saved && successMessage ? (
        <p className="mt-2 text-sm font-semibold text-[#2f6b3f]" role="status">
          ✓ {successMessage}
        </p>
      ) : null}
    </form>
  );
}
