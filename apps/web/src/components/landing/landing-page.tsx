import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@my-better-t-app/ui/components/button";
import { Eye, Unplug, UserCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

import { GuidePreview } from "./guide-preview";

const steps = [
  {
    title: "Conecte seus bancos",
    description:
      "Pelo Open Finance, com permissão só de leitura. Sua senha fica com o banco, nunca com a gente.",
  },
  {
    title: "A gente calcula",
    description:
      "Carnê-leão, DAS do MEI e do Simples, DIRPF. Cada valor mostra as transações e a regra que o geraram.",
  },
  {
    title: "Você aprova",
    description: "Preparamos as guias e as declarações. Nada é pago ou enviado sem o seu sim.",
  },
];

const promises = [
  {
    icon: Eye,
    title: "Só leitura",
    description: "Pedimos o mínimo de acesso para calcular seus impostos.",
  },
  {
    icon: UserCheck,
    title: "Sua aprovação, sempre",
    description: "Você vê o valor exato antes de qualquer pagamento ou envio.",
  },
  {
    icon: Unplug,
    title: "Desconecte quando quiser",
    description: "Ao desconectar um banco, apagamos os dados que vieram dele.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <BrandMark />
        <SignInButton>
          <Button variant="ghost">Entrar</Button>
        </SignInButton>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 pt-16 pb-24">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[56px]">
              Seus impostos, do banco à Receita.
            </h1>
            <p className="mt-5 max-w-md text-[17px] text-muted-foreground">
              Conecte suas contas e a gente cuida do resto: calcula o que você deve, prepara as
              guias e as declarações, e só paga ou envia depois do seu sim.
            </p>
            <div className="mt-8">
              <SignUpButton>
                <Button size="lg">Começar</Button>
              </SignUpButton>
            </div>
          </div>
          <GuidePreview />
        </section>

        <section>
          <h2 className="text-[22px] font-semibold tracking-tight">Como funciona</h2>
          <ol className="mt-8 grid gap-10 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t pt-5">
                <span className="font-mono text-sm text-primary tabular-nums">0{index + 1}</span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border bg-card p-8">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Seus dados financeiros são só seus
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {promises.map((promise) => (
              <li key={promise.title}>
                <promise.icon className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">{promise.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{promise.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>Finora</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
