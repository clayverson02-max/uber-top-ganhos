import { supabase } from "@/integrations/supabase/client";
import type { DocType } from "./crm";

export const MAX_PDF = 10 * 1024 * 1024;
export const validatePdf = (f: File | null | undefined): string | null => {
  if (!f) return "Selecione um arquivo PDF";
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return "O arquivo deve ser PDF";
  if (f.size > MAX_PDF) return "O arquivo deve ter no máximo 10 MB";
  return null;
};

/** Envia (ou substitui) um documento protegido do cliente. */
export async function uploadDoc(clientId: string, type: DocType, file: File, userId: string) {
  const path = `${clientId}/${type}-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from("client-docs").upload(path, file, { contentType: "application/pdf" });
  if (upErr) throw upErr;
  await supabase.from("client_documents").update({ is_current: false }).eq("client_id", clientId).eq("doc_type", type).eq("is_current", true);
  const { error } = await supabase.from("client_documents").insert({
    client_id: clientId, doc_type: type, file_path: path, file_name: file.name.slice(0, 200), uploaded_by: userId,
  });
  if (error) throw error;
  await supabase.from("client_history").insert({
    client_id: clientId, user_id: userId, kind: "documento",
    description: `${type === "fatura" ? "Fatura de energia" : "Documento com foto"} enviado: ${file.name.slice(0, 120)}`,
  });
}

export async function openDoc(path: string) {
  const { data, error } = await supabase.storage.from("client-docs").createSignedUrl(path, 120);
  if (error || !data) throw error ?? new Error("Sem acesso");
  window.open(data.signedUrl, "_blank", "noopener");
}
