import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { waLink } from "@/lib/crm";

export function WhatsappActions({ whatsapp, compact }: { whatsapp: string; compact?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(whatsapp); toast.success("WhatsApp copiado"); }}>
        <Copy className="h-4 w-4" />{!compact && "Copiar"}
      </Button>
      <Button size="sm" variant="secondary" asChild onClick={(e) => e.stopPropagation()}>
        <a href={waLink(whatsapp)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />{!compact && "Abrir conversa"}</a>
      </Button>
    </div>
  );
}
