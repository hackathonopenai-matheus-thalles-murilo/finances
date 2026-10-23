import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export type NavLinkProps = {
  to: LinkProps["to"];
  icon: LucideIcon;
  label: string;
};

export function NavLink({ to, icon: Icon, label }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-sidebar-accent/60"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
