import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-lockgrid-600 text-white hover:bg-lockgrid-700 active:bg-lockgrid-800 focus:ring-lockgrid-500/50":
              variant === "primary",
            "bg-gray-100 dark:bg-surface-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400/50":
              variant === "secondary",
            "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary focus:ring-gray-400/50":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500/50":
              variant === "danger",
          },
          {
            "px-2.5 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
