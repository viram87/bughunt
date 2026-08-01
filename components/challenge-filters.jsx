"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();

  function setFilter(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {FILTERS.map(({ key, label, options }) => (
        <Select
          key={key}
          value={searchParams.get(key) ?? "all"}
          onValueChange={(value) => setFilter(key, value)}
        >
          <SelectTrigger className="w-[180px]">
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
    </div>
  );
}
