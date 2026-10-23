import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-better-t-app/ui/components/select";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { currentAnoCalendario } from "@/lib/format";

export type YearSelectProps = {
  anoCalendario: number;
};

export function YearSelect({ anoCalendario }: YearSelectProps) {
  const navigate = useNavigate();
  const current = currentAnoCalendario();
  const items = [current, current - 1].map((year) => ({
    value: year,
    label: `Ano-calendário ${year}`,
  }));

  return (
    <Select
      items={items}
      value={anoCalendario}
      onValueChange={(year) => {
        if (year === null) return;
        navigate({ to: ".", search: { anoCalendario: year } });
      }}
    >
      <SelectTrigger>
        <CalendarDays />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
