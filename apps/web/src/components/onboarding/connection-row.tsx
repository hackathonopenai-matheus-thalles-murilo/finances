import type { LucideIcon } from "lucide-react";

export type ConnectionRowProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action: React.ReactNode;
};

export function ConnectionRow({ icon: Icon, title, description, action }: ConnectionRowProps) {
  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3.5 px-4.5 py-3.5">
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-[14.5px] font-semibold">{title}</p>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </div>
  );
}
