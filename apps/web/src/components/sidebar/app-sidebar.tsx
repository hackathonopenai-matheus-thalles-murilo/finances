import { UserButton } from "@clerk/react";
import {
  Building2,
  CalendarCheck,
  FileText,
  Landmark,
  LayoutDashboard,
  Sparkles,
  UserRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

import { NavLink } from "./nav-link";

export function AppSidebar() {
  return (
    <aside className="flex w-58 shrink-0 flex-col gap-0.5 border-r border-sidebar-border bg-sidebar px-3.5 py-5 text-sm font-medium text-sidebar-foreground">
      <div className="px-2 pt-1 pb-5">
        <BrandMark />
      </div>
      <NavLink to="/dashboard" icon={LayoutDashboard} label="Visão geral" />
      <NavLink to="/obligations" icon={CalendarCheck} label="Obrigações" />
      <NavLink to="/tax-agents" icon={Sparkles} label="Agentes fiscais" />
      <NavLink to="/documents" icon={FileText} label="Documentos" />
      <p className="px-2.5 pt-4.5 pb-1.5 text-[11px] tracking-wider text-muted-foreground uppercase">
        Seus dados
      </p>
      <NavLink to="/connections" icon={Landmark} label="Conexões" />
      <NavLink to="/fiscal-profile" icon={UserRound} label="Perfil fiscal" />
      <NavLink to="/companies" icon={Building2} label="Empresas" />
      <div className="mt-auto px-1.5 py-2">
        <UserButton showName />
      </div>
    </aside>
  );
}
