import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Empty, Loading, PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { brl, fmtDateTime } from "@/lib/crm";
import { toast } from "sonner";

export default function Trash() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["deleted-clients"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["docs"] });
  };

  const restore = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    const { error } = await supabase.from("clients").update({ deleted_at: null }).eq("id", id);
    setBusyId(null);
    if (error) return toast.error("Não foi possível restaurar: " + error.message);
    toast.success("Cliente restaurado");
    refresh();
  };

  const permanentlyDelete = async (id: string, name: string) => {
    if (busyId) return;
    const approved = confirm(
      `Excluir definitivamente ${name}? O cadastro não poderá ser restaurado depois dessa ação.`
    );
    if (!approved) return;

    setBusyId(id);
    const { data: deleted, error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .select("id");
    setBusyId(null);

    if (error) return toast.error("Não foi possível excluir definitivamente: " + error.message);
    if (!deleted?.length) {
      return toast.error("O cadastro não foi excluído. Atualize a página e tente novamente.");
    }

    toast.success("Cliente excluído definitivamente");
    refresh();
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Lixeira"
        subtitle="Clientes arquivados ficam aqui. O administrador pode restaurar ou excluir definitivamente."
      />
      {!clients.length ? (
        <Empty title="A lixeira está vazia">
          Registros arquivados aparecerão nesta área.
        </Empty>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const isBusy = busyId === client.id;
            return (
              <div
                key={client.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-bold">{client.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp: {client.whatsapp} · Fatura: {brl(client.avg_bill)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Arquivado em {fmtDateTime(client.deleted_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    disabled={!!busyId}
                    onClick={() => restore(client.id)}
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Restaurar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!!busyId}
                    onClick={() => permanentlyDelete(client.id, client.full_name)}
                  >
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Excluir definitivamente
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <Trash2 className="mt-0.5 h-4 w-4 shrink-0" />
        Restaurar devolve o cadastro para a lista de clientes. A exclusão definitiva não pode ser desfeita.
      </div>
    </div>
  );
}
