import type { AccountSituation } from "@my-better-t-app/backend/convex/onboarding";
import type { Situation } from "@my-better-t-app/backend/convex/profile";
import {
  Briefcase,
  Building2,
  Globe,
  House,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type SituationOption = {
  situation: Situation;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const situationOptions: SituationOption[] = [
  {
    situation: "salary",
    title: "Salário com carteira",
    description: "CLT, com holerite e 13º",
    icon: Briefcase,
  },
  {
    situation: "foreignIncome",
    title: "Recebo do exterior",
    description: "Trabalho pago em outra moeda",
    icon: Globe,
  },
  {
    situation: "company",
    title: "Tenho empresa",
    description: "MEI, Simples ou Presumido",
    icon: Building2,
  },
  {
    situation: "investments",
    title: "Invisto",
    description: "Ações, fundos, FIIs ou cripto",
    icon: TrendingUp,
  },
  {
    situation: "rent",
    title: "Recebo aluguel",
    description: "Imóveis alugados no Brasil",
    icon: House,
  },
  {
    situation: "dependents",
    title: "Tenho dependentes",
    description: "Filhos, cônjuge ou pais",
    icon: Users,
  },
];

export const accountCopy: Record<
  AccountSituation,
  { title: string; description: string; icon: LucideIcon }
> = {
  salary: { title: "Conta do salário", description: "Onde cai seu salário", icon: Briefcase },
  foreignIncome: {
    title: "Conta que recebe do exterior",
    description: "Onde chega o dinheiro do exterior",
    icon: Globe,
  },
  company: {
    title: "Conta da sua empresa",
    description: "Onde a empresa recebe e paga",
    icon: Building2,
  },
  investments: {
    title: "Sua corretora",
    description: "Onde ficam seus investimentos",
    icon: TrendingUp,
  },
  rent: { title: "Conta do aluguel", description: "Onde cai o aluguel", icon: House },
};
