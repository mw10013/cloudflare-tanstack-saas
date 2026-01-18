"use client";

import { useTheme } from "better-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

interface ThemeSwitcherProps {
  size?: "sm" | "lg";
}

export function ThemeSwitcher({ size = "sm" }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  const sizeClasses = {
    sm: {
      container: "gap-2",
      wrapper: "p-1",
      button: "size-7",
      icon: "h-3.5 w-3.5",
    },
    lg: {
      container: "gap-2",
      wrapper: "p-2",
      button: "size-10",
      icon: "h-5 w-5",
    },
  } as const;

  const classes = sizeClasses[size];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("flex items-center", classes.container)}
    >
      <div
        className={cn(
          "border-border bg-muted flex rounded-full border",
          classes.wrapper,
        )}
      >
        {themeOptions.map(({ value, icon: Icon, label }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              onClick={() => { setTheme(value); }}
              className={cn(
                "flex items-center justify-center rounded-full transition-colors",
                classes.button,
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon fill="currentColor" className={classes.icon} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
