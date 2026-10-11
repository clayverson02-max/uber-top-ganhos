import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useDocs = () =>
  useQuery({
    queryKey: ["docs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_documents").select("*").order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useProfiles = () =>
  useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

export const useBonuses = () =>
  useQuery({
    queryKey: ["bonuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bonuses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useRevenues = () =>
  useQuery({
    queryKey: ["revenues"],
    queryFn: async () => {
      const { data, error } = await supabase.from("monthly_revenues").select("*").order("reference_month", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
