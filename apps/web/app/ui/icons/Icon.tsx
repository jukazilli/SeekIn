import type { ReactNode } from "react";

export type IconName = "arrow-left" | "home";

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
