export type PageProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function Page({ title, description, actions, children }: PageProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-10 py-7">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}
