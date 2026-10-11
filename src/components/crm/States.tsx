import { Loader2, Inbox } from "lucide-react";
import { ReactNode } from "react";

export const Loading = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando…</div>
);
export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-12 text-center">
    <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
    <p className="font-semibold">{title}</p>
    {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
  </div>
);
export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);
