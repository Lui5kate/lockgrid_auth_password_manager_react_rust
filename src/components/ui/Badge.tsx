import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
        "bg-gray-100 dark:bg-surface-dark-tertiary text-gray-600 dark:text-gray-400",
        className,
      )}
      style={
        color
          ? {
              backgroundColor: `${color}20`,
              color: color,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
