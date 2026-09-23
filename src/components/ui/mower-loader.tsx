import { Mower } from "@/components/ui/mower";

export function MowerLoader({ label = "Gartenplan wird geladen" }: { label?: string }) {
  return (
    <div aria-live="polite" className="overflow-hidden rounded-2xl border border-[#cbd8c1] bg-[#fffef9] shadow-[0_2px_0_#d7dfcf]" role="status">
      <div className="loader-track relative h-32 overflow-hidden bg-[linear-gradient(180deg,#eaf3df_0%,#dbeacb_100%)]">
        <svg aria-hidden="true" className="absolute right-6 top-4 h-9 w-9" viewBox="0 0 40 40">
          <circle cx="20" cy="20" fill="#f3d58a" r="9" />
          <g stroke="#e6bd5c" strokeLinecap="round" strokeWidth="2.5">
            <path d="M20 3v5M20 32v5M3 20h5M32 20h5M8 8l3.5 3.5M28.5 28.5L32 32M8 32l3.5-3.5M28.5 11.5L32 8" />
          </g>
        </svg>
        <div className="lawn-tall absolute inset-x-0 bottom-0 h-12" />
        <div className="loader-trail lawn-mowed absolute bottom-0 left-0 h-12" />
        <div className="loader-mower absolute bottom-4">
          <Mower className="h-16 w-28" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-[#405039]">
        <span className="font-display text-base font-semibold">{label}</span>
        <span className="text-xs text-[#6d7669]">Einen Moment</span>
      </div>
    </div>
  );
}
