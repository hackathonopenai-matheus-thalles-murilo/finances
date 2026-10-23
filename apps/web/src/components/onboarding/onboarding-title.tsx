export type OnboardingTitleProps = {
  title: string;
  description: string;
};

export function OnboardingTitle({ title, description }: OnboardingTitleProps) {
  return (
    <div>
      <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{description}</p>
    </div>
  );
}
