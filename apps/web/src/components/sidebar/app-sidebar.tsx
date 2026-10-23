import { UserButton } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  FileText,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Sparkles,
  UserRound,
} from "lucide-react";

import { NavPlaceholder } from "./nav-placeholder";

export function AppSidebar() {
  return (
    <aside className="flex w-58 shrink-0 flex-col gap-0.5 border-r border-sidebar-border bg-sidebar px-3.5 py-5 text-sm font-medium text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-5 text-[15px] font-semibold text-foreground">
        <span className="grid size-6.5 place-items-center rounded-md bg-foreground text-background">
          <ReceiptText className="size-4" />
        </span>
        Finances
      </div>
      <Link
        to="/dashboard"
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
      >
        <LayoutDashboard className="size-4" />
        Visão geral
      </Link>
      <NavPlaceholder icon={CalendarCheck} label="Obrigações" />
      <NavPlaceholder icon={Sparkles} label="Agentes fiscais" />
      <NavPlaceholder icon={FileText} label="Documentos" />
      <p className="px-2.5 pt-4.5 pb-1.5 text-[11px] tracking-wider text-muted-foreground uppercase">
        Seus dados
      </p>
      <NavPlaceholder icon={Landmark} label="Conexões" />
      <NavPlaceholder icon={UserRound} label="Perfil fiscal" />
      <NavPlaceholder icon={Building2} label="Empresas" />
      <div className="mt-auto px-1.5 py-2">
        <UserButton showName />
      </div>
    </aside>
  );
}
