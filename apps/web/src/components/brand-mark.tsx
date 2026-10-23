import { ReceiptText } from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 text-[15px] font-semibold text-foreground">
      <span className="grid size-6.5 place-items-center rounded-md bg-foreground text-background">
        <ReceiptText className="size-4" />
      </span>
      Finora
    </div>
  );
}
