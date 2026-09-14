import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = ["button", `button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
    >
      {children}
    </button>
  );
}
