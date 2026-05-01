import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-[#2f6b3f] text-white shadow-sm shadow-[#2f6b3f]/20 hover:bg-[#275a35]",
    secondary: "bg-white text-[#172016] ring-1 ring-[#d7dfcf] hover:bg-[#eef4e8]",
    ghost: "bg-transparent text-[#2f6b3f] hover:bg-[#e3ecd9]",
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
