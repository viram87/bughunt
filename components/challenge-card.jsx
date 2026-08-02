import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUG_CATEGORIES, DIFFICULTIES } from "@/lib/constants";

// Difficulty reads as a scale, so it gets a scale of colors. (The previous
// mapping made "medium" a solid black pill — louder than "hard".)
const DIFFICULTY_CLASS = {
  easy: "border-transparent bg-success/12 text-success",
  medium: "border-transparent bg-warning/15 text-warning-foreground dark:text-warning",
  hard: "border-transparent bg-destructive/12 text-destructive",
};

const LANGUAGE_CLASS = {
  python: "border-transparent bg-chart-2/12 text-chart-2",
  javascript: "border-transparent bg-chart-4/15 text-warning-foreground dark:text-chart-4",
};

// `status` is optional: the dashboard's bookmark cards don't pass it, and
// signed-out visitors have no attempt history, so both render unchanged.
export function ChallengeCard({ challenge, status = null }) {
  const categoryLabel =
    BUG_CATEGORIES.find((c) => c.value === challenge.bug_category)?.label ?? challenge.bug_category;
  const difficultyLabel =
    DIFFICULTIES.find((d) => d.value === challenge.difficulty)?.label ?? challenge.difficulty;

  return (
    <Link href={`/challenges/${challenge.id}`} className="group block">
      <Card
        className={`h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:ring-primary/30 group-hover:shadow-lg group-hover:shadow-primary/5 ${
          status === "solved" ? "bg-success/[0.04]" : ""
        }`}
      >
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={LANGUAGE_CLASS[challenge.language]}>{challenge.language}</Badge>
            <Badge className={DIFFICULTY_CLASS[challenge.difficulty]}>{difficultyLabel}</Badge>
            {status === "solved" && (
              <Badge className="border-transparent bg-success/12 text-success">
                <CheckIcon className="size-3" /> Solved
              </Badge>
            )}
            {status === "tried" && (
              <Badge className="border-transparent bg-muted text-muted-foreground">Tried</Badge>
            )}
          </div>

          <CardTitle className="text-base leading-snug transition-colors group-hover:text-primary">
            {challenge.title}
          </CardTitle>

          {challenge.problem_description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {challenge.problem_description}
            </p>
          )}

          <p className="text-xs font-medium tracking-wide text-muted-foreground/80 uppercase">
            {categoryLabel}
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}
