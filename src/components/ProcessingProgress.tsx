import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Cpu, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressState {
  stage: "uploading" | "processing" | "downloading";
  percent: number; // 0-100
}

const stages = [
  { key: "uploading", label: "Uploading", icon: Upload },
  { key: "processing", label: "Processing", icon: Cpu },
  { key: "downloading", label: "Downloading", icon: Download },
] as const;

interface Props {
  progress: ProgressState;
}

export default function ProcessingProgress({ progress }: Props) {
  const stageIndex = stages.findIndex((s) => s.key === progress.stage);

  // Overall progress: each stage is ~33%
  const overall = Math.min(
    100,
    stageIndex * 33 + (progress.percent / 100) * 33
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium text-foreground">
          {stages[stageIndex].label}…
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {Math.round(overall)}%
        </span>
      </div>

      <Progress value={overall} className="h-2" />

      <div className="flex justify-between">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === stageIndex;
          const isDone = i < stageIndex;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
