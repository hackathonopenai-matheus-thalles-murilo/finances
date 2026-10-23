import { buttonVariants } from "@my-better-t-app/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";

import { PendenciaItem } from "./pendencia-item";

export function OnboardingPendencia() {
  return (
    <PendenciaItem
      icon={ListChecks}
      tone="default"
      tag="Configuração"
      title="Termine de configurar sua conta"
      description="Conte sua situação e conecte seus bancos para acompanharmos seus impostos."
      actions={
        <Link to="/onboarding" className={buttonVariants()}>
          Continuar configuração
        </Link>
      }
      aside={null}
    />
  );
}
