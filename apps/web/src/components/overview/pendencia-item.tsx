import { Badge } from "@my-better-t-app/ui/components/badge";
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "warning" | "destructive";

const iconToneClassName: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export type PendenciaItemProps = {
  icon: LucideIcon;
  tone: Tone;
  tag: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  aside: React.ReactNode;
};

export function PendenciaItem({
  icon: Icon,
  tone,
  tag,
  title,
  description,
  actions,
  aside,
}: PendenciaItemProps) {
  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-start gap-3.5 px-5 py-4">
      <span className={`grid size-9 place-items-center rounded-lg ${iconToneClassName[tone]}`}>
        <Icon className="size-4.5" />
      </span>
      <div>
        <Badge variant={tone}>{tag}</Badge>
        <p className="mt-1 mb-0.5 text-[15px] font-semibold">{title}</p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
        <div className="mt-2.5 flex items-center gap-2">{actions}</div>
      </div>
      <div className="text-right">{aside}</div>
    </div>
  );
}
