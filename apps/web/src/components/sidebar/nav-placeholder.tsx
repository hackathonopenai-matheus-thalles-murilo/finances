import type { LucideIcon } from "lucide-react";

export type NavPlaceholderProps = {
  icon: LucideIcon;
  label: string;
};

export function NavPlaceholder({ icon: Icon, label }: NavPlaceholderProps) {
  return (
    <span aria-disabled className="flex items-center gap-2.5 px-2.5 py-2 opacity-50">
      <Icon className="size-4" />
      {label}
    </span>
  );
}
