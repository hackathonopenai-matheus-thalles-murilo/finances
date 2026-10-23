import { Card } from "@my-better-t-app/ui/components/card";

export type OverviewSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function OverviewSection({ title, children }: OverviewSectionProps) {
  return (
    <section>
      <h2 className="mb-2.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </h2>
      <Card size="flush">{children}</Card>
    </section>
  );
}
