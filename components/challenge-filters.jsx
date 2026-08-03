"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, BUG_CATEGORIES, DIFFICULTIES } from "@/lib/constants";

const FILTERS = [
  { key: "language", label: "Language", options: LANGUAGES },
  { key: "bug_category", label: "Bug category", options: BUG_CATEGORIES },
  { key: "difficulty", label: "Difficulty", options: DIFFICULTIES },
];

export function ChallengeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  // Push to the CURRENT path, not a hardcoded "/". This was pushing to the
  // root, which since the list moved to /challenges meant every filter
  // bounced the user back to the landing page.
  function apply(params) {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setFilter(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    apply(params);
  }

  // Debounced so typing doesn't fire a navigation per keystroke.
  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (query === currentQ) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      apply(params);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    FILTERS.some(({ key }) => searchParams.get(key));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search challenges…"
          aria-label="Search challenges"
          className="w-[210px] pl-8"
        />
      </div>

      {FILTERS.map(({ key, label, options }) => (
        <Select
          key={key}
          value={searchParams.get(key) ?? "all"}
          onValueChange={(value) => setFilter(key, value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            router.push(pathname);
          }}
        >
          <XIcon /> Clear
        </Button>
      )}
    </div>
  );
}
