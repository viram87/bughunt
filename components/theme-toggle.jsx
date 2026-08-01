"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Both icons are always rendered and swapped by the `dark:` variant rather
  // than by client state. next-themes sets the class before first paint, so
  // this is correct on the server render too — no mount flag, no mismatch.
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
      <MoonIcon className="absolute size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
    </Button>
  );
}
