type MowerProps = {
  className?: string;
  color?: string;
  accent?: string;
  idle?: boolean;
};

// Side view of a push mower driving to the right; wheels, body and clippings are animated in globals.css.
export function Mower({ className = "h-14 w-24", color = "#2f6b3f", accent = "#d2a24c", idle = false }: MowerProps) {
  return (
    <svg aria-hidden="true" className={`${className} ${idle ? "mower-idle" : ""} overflow-visible`} viewBox="0 0 120 72">
      <g>
        <path className="mower-clipping" d="M18 58l-3-6 3 1z" fill="#4d9350" />
        <path className="mower-clipping" d="M22 60l-4-4 3-1z" fill="#3f7f45" />
        <path className="mower-clipping" d="M16 62l-5-3 3-2z" fill="#79a85d" />
        <path className="mower-clipping" d="M20 56l-2-6 3 2z" fill="#4d9350" />
      </g>
      <g className="mower-body">
        <path d="M44 38 L14 6" fill="none" stroke="#405039" strokeLinecap="round" strokeWidth="4" />
        <path d="M10 4h10" fill="none" stroke="#172016" strokeLinecap="round" strokeWidth="5" />
        <path d="M18 22c0-2 2-4 4-4h16l8 20H22c-2 0-4-2-4-4z" fill="#c9b27a" />
        <path d="M22 24h14M22 29h16" stroke="#a88f55" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M30 40c0-5 4-9 9-9h46c9 0 16 6 18 14l1 5H30z" fill={color} />
        <path d="M30 50h74l-2 5H32z" fill="#1f4a2b" />
        <rect fill={accent} height="10" rx="4" width="22" x="54" y="23" />
        <rect fill="#172016" height="4" rx="2" width="8" x="61" y="19" />
        <path d="M84 38h12" stroke="#e7efe1" strokeLinecap="round" strokeWidth="2.5" />
      </g>
      <g className="mower-wheel">
        <circle cx="40" cy="58" fill="#172016" r="12" />
        <circle cx="40" cy="58" fill="#f4efe1" r="5" />
        <path d="M40 48v6M40 62v6M30 58h6M44 58h6" stroke="#5a6655" strokeWidth="2" />
      </g>
      <g className="mower-wheel">
        <circle cx="94" cy="61" fill="#172016" r="9" />
        <circle cx="94" cy="61" fill="#f4efe1" r="3.5" />
        <path d="M94 53v4M94 65v4M86 61h4M98 61h4" stroke="#5a6655" strokeWidth="1.6" />
      </g>
    </svg>
  );
}
