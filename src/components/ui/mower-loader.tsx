export function MowerLoader({ label = "Aktualisiere Gartenplan" }: { label?: string }) {
  return (
    <div className="rounded-lg border border-[#cbd8c1] bg-[#fffef9] p-5 shadow-sm shadow-[#4a5d3f]/5">
      <div className="relative h-24 overflow-hidden rounded-lg bg-[linear-gradient(180deg,#e7f0dc_0%,#c7dfb0_100%)]">
        <div className="absolute inset-x-0 bottom-0 h-9 bg-[repeating-linear-gradient(90deg,#3f7f45_0_10px,#4d9350_10px_20px)] opacity-90" />
        <div className="mower-drive absolute bottom-5 left-0">
          <svg aria-hidden="true" className="h-14 w-24 drop-shadow-sm" viewBox="0 0 120 70">
            <path d="M15 43h57l18-18h12l-15 30H18z" fill="#2f6b3f" />
            <path d="M28 24h34l9 19H18z" fill="#79a85d" />
            <path d="M66 28h16l-10 15h-9z" fill="#d8e8cf" />
            <path d="M88 19h24" stroke="#405039" strokeLinecap="round" strokeWidth="5" />
            <circle cx="31" cy="55" fill="#172016" r="10" />
            <circle cx="76" cy="55" fill="#172016" r="10" />
            <circle cx="31" cy="55" fill="#f4efe1" r="4" />
            <circle cx="76" cy="55" fill="#f4efe1" r="4" />
          </svg>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#405039]">
        <span className="font-semibold">{label}</span>
        <span className="grass-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}
