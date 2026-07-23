import type { ReactNode } from "react";

export function SectionPage({
  kicker,
  title,
  description,
  actions,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="section-page">
      <header className="section-page-header">
        <div>
          <span className="section-page-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="section-page-actions">{actions}</div> : null}
      </header>
      <div className="section-page-body">{children}</div>
    </main>
  );
}
