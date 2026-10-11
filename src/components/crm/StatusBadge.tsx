import { statusColor, statusLabel, docStatusLabel, type ClientStatus, type DocStatus } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  const c = statusColor(status);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", className)}
      style={{ color: c, backgroundColor: `hsl(var(--st-${status}) / 0.12)` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {statusLabel(status)}
    </span>
  );
}

const docTone: Record<DocStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  recebido: "bg-primary/10 text-primary",
  em_analise: "bg-accent/25 text-accent-foreground",
  aprovado: "bg-success/15 text-success",
  rejeitado: "bg-destructive/10 text-destructive",
};
export function DocBadge({ status }: { status: DocStatus }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", docTone[status])}>{docStatusLabel(status)}</span>;
}
