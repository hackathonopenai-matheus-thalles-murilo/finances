import { Checkbox } from "@my-better-t-app/ui/components/checkbox";

import type { SituationOption } from "@/lib/situation";

export type SituationCardProps = {
  option: SituationOption;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
};

export function SituationCard({ option, isChecked, onCheckedChange }: SituationCardProps) {
  const { title, description, icon: Icon } = option;

  return (
    <label
      className={`relative flex w-66 cursor-pointer flex-col rounded-xl border-[1.5px] bg-card p-4.5 transition-[transform,border-color] duration-100 ease-out select-none active:scale-[0.98] ${isChecked ? "border-primary" : "border-border"}`}
    >
      <span
        className={`mb-3.5 grid size-9 place-items-center rounded-lg ${isChecked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="text-[15px] font-semibold">{title}</span>
      <span className="text-[13px] text-muted-foreground">{description}</span>
      <span className="absolute top-4 right-4">
        <Checkbox checked={isChecked} onCheckedChange={onCheckedChange} />
      </span>
    </label>
  );
}
