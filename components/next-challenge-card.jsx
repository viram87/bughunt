import Link from "next/link";
import { ArrowRightIcon, TargetIcon } from "lucide-react";
import { BUG_CATEGORIES, DIFFICULTIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

const DIFFICULTY_CLASS = {
  easy: "border-transparent bg-success/12 text-success",
  medium: "border-transparent bg-warning/15 text-warning-foreground dark:text-warning",
  hard: "border-transparent bg-destructive/12 text-destructive",
};

const label = (list, value) => list.find((x) => x.value === value)?.label ?? value;

/** Renders the output of pickNextChallenge(); renders nothing when null. */
export function NextChallengeCard({ recommendation, heading = "Recommended next" }) {
  if (!recommendation?.challenge) return null;
  const { challenge, reason } = recommendation;

  return (
    <Link href={`/challenges/${challenge.id}`} className="group block">
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-accent/50 to-transparent p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/50">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className="border-transparent bg-primary/12 text-primary">
            <TargetIcon className="size-3" /> {heading}
          </Badge>
          <Badge variant="outline">{challenge.language}</Badge>
          <Badge className={DIFFICULTY_CLASS[challenge.difficulty]}>
            {label(DIFFICULTIES, challenge.difficulty)}
          </Badge>
          <Badge variant="outline">{label(BUG_CATEGORIES, challenge.bug_category)}</Badge>
        </div>
        <p className="flex items-center gap-1.5 text-lg font-semibold transition-colors group-hover:text-primary">
          {challenge.title}
          <ArrowRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
      </div>
    </Link>
  );
}
