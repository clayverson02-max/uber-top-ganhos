import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { brl, fmtDateTime } from "@/lib/crm";
import { toast } from "sonner";

export default function Trash() {
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["deleted-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const restore = async (id: string) => {
    const { error } = await supabase.from("clients").update({ deleted_at: null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente restaurado");
    qc.invalidateQueries({ queryKey: ["deleted-clients"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Lixeira"
        subtitle="Clientes arquivados ficam aqui e podem ser restaurados pelo administrador."
      />
      {!clients.length ? (
        <Empty title="A lixeira está vazia">
          Registros arquivados aparecerão nesta área.
        </Empty>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{client.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  WhatsApp: {client.whatsapp} · Fatura: {brl(client.avg_bill)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Arquivado em {fmtDateTime(client.deleted_at)}
                </p>
              </div>
              <Button variant="outline" onClick={() => restore(client.id)}>
                <RotateCcw className="h-4 w-4" />
                Restaurar cliente
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Trash2 className="h-4 w-4" />
        A exclusão é reversível para evitar perda acidental de dados.
      </div>
    </div>
  );
}
