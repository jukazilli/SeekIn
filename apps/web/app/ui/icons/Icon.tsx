import type { ReactNode } from "react";

export type IconName =
  "arrow-left" | "hide-password" | "home" | "lock" | "mail" | "show-password";

interface IconProps {
  className?: string;
  label?: string;
  name: IconName;
  size?: number;
}

const paths: Record<IconName, ReactNode> = {
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </>
  ),
  home: (
    <>
      <path d="m4 10 8-6 8 6" />
      <path d="M6.5 9v10h11V9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  "hide-password": (
    <>
      <path d="m4 4 16 16" />
      <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
      <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5.4 0 9 5.1 9 8a8.7 8.7 0 0 1-2 3.7" />
      <path d="M6.6 6.6C4.4 8 3 10.2 3 12c0 2.9 3.6 8 9 8 1.4 0 2.7-.3 3.8-.9" />
    </>
  ),
  lock: (
    <>
      <rect height="10" rx="2" width="14" x="5" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  mail: (
    <>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  "show-password": (
    <>
      <path d="M3 12c0-2.9 3.6-8 9-8s9 5.1 9 8-3.6 8-9 8-9-5.1-9-8Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
};

export function Icon({ className, label, name, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      fill="none"
      focusable="false"
      height={size}
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}
