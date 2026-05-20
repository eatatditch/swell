import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TRAINING_RESOURCE_KIND_LABELS } from "@/lib/constants/training";
import type {
  TrainingLessonResource,
  TrainingResourceKind,
} from "@/lib/types/database";

const ICONS: Record<TrainingResourceKind, LucideIcon> = {
  video: Video,
  pdf: FileText,
  image: ImageIcon,
  link: ExternalLink,
  download: Download,
};

export function ResourceList({
  resources,
}: {
  resources: TrainingLessonResource[];
}) {
  if (resources.length === 0) return null;
  return (
    <ul className="space-y-2">
      {resources.map((r) => {
        const Icon = ICONS[r.kind];
        return (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm hover:bg-muted/60"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-accent">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.label || r.url}</p>
                <p className="text-xs text-muted-foreground">
                  {TRAINING_RESOURCE_KIND_LABELS[r.kind]}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
