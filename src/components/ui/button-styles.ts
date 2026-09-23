export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#2f6b3f] text-white shadow-[0_2px_0_#1f4a2b] hover:bg-[#275a35]",
  secondary: "bg-white text-[#172016] ring-1 ring-[#d7dfcf] shadow-[0_2px_0_#d7dfcf] hover:bg-[#f8faf3]",
  ghost: "bg-transparent text-[#2f6b3f] hover:bg-[#e7efe1]",
  danger: "bg-red-600 text-white shadow-[0_2px_0_#991b1b] hover:bg-red-700",
};

export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;
}
