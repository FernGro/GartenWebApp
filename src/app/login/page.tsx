import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SupabaseSetupWarning } from "@/components/ui/setup-warning";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 rounded-lg border border-[#d7dfcf] bg-[#fffef9]/80 p-5 shadow-sm shadow-[#4a5d3f]/5">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#2f6b3f]">Garten Dienstplan</p>
        <h1 className="mt-2 text-3xl font-bold text-[#172016]">Gartenarbeit fair verteilen</h1>
        <p className="mt-3 text-sm leading-6 text-[#5a6655]">
          Aufgaben planen, Punkte automatisch berechnen und Dienste nachvollziehbar erledigen.
        </p>
      </div>
      <div className="space-y-4">
        <SupabaseSetupWarning />
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
