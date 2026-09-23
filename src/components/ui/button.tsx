"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonVariant } from "@/components/ui/button-styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className = "", variant = "primary", type = "button", disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  const isSubmitting = pending && type === "submit";

  return (
    <button
      aria-busy={isSubmitting || undefined}
      className={buttonClass(variant, className)}
      data-pending={isSubmitting || undefined}
      disabled={disabled || isSubmitting}
      type={type}
      {...props}
    >
      {isSubmitting ? <span aria-hidden="true" className="btn-spinner" /> : null}
      {children}
    </button>
  );
}
