import { supabase } from "@/integrations/supabase/client";
import type { DocType } from "./crm";

export const MAX_FILE = 10 * 1024 * 1024;
export const MAX_PDF = MAX_FILE;

export const validatePdf = (f: File | null | undefined): string | null => {
  if (!f) return "Selecione um arquivo PDF";
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return "O arquivo deve ser PDF";
  if (f.size > MAX_PDF) return "O arquivo deve ter no máximo 10 MB";
  return null;
};

export const validateDocument = (f: File | null | undefined): string | null => {
  if (!f) return "Selecione um PDF ou uma imagem";
  const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  const isImage = f.type.startsWith("image/");
  if (!isPdf && !isImage) return "Envie um PDF ou uma imagem (JPG, PNG ou WEBP)";
  if (f.size > MAX_FILE) return "O arquivo deve ter no máximo 10 MB";
  return null;
};

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName) return fromName.slice(0, 10);
  if (file.type === "application/pdf") return "pdf";
  return file.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "bin";
}

/** Envia (ou substitui) um documento protegido do cliente. */
export async function uploadDoc(clientId: string, type: DocType, file: File, userId: string) {
  const extension = extensionFor(file);
  const path = clientId + "/" + type + "-" + Date.now() + "." + extension;
  const { error: upErr } = await supabase.storage
    .from("client-docs")
    .upload(path, file, { contentType: file.type || (extension === "pdf" ? "application/pdf" : "application/octet-stream") });

  if (upErr) throw upErr;

  await supabase
    .from("client_documents")
    .update({ is_current: false })
    .eq("client_id", clientId)
    .eq("doc_type", type)
    .eq("is_current", true);

  const { error } = await supabase.from("client_documents").insert({
    client_id: clientId,
    doc_type: type,
    file_path: path,
    file_name: file.name.slice(0, 200),
    uploaded_by: userId,
  });

  if (error) throw error;

  await supabase.from("client_history").insert({
    client_id: clientId,
    user_id: userId,
    kind: "documento",
    description: (type === "fatura" ? "Fatura de energia" : "Documento com foto") + " enviado: " + file.name.slice(0, 120),
  });
}

async function downloadProtectedFile(path: string) {
  const { data, error } = await supabase.storage.from("client-docs").download(path);
  if (error || !data) throw error ?? new Error("Não foi possível acessar o arquivo");
  return data;
}

/** Abre um arquivo privado usando a sessão autenticada do administrador/equipe interna. */
export async function openDoc(path: string, target?: Window | null) {
  const file = await downloadProtectedFile(path);
  const url = URL.createObjectURL(file);

  if (target && !target.closed) {
    target.location.href = url;
  } else {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = url;
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Baixa um arquivo privado para o computador/celular do usuário autenticado. */
export async function downloadDoc(path: string, fileName = "documento") {
  const file = await downloadProtectedFile(path);
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName || "documento";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
