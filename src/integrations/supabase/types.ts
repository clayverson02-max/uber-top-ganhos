export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bonuses: {
        Row: {
          amount: number
          client_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          responsible_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          client_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          responsible_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          responsible_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonuses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          is_current: boolean
          status: Database["public"]["Enums"]["doc_status"]
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          doc_type: string
          file_name: string
          file_path: string
          id?: string
          is_current?: boolean
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string
        }
        Update: {
          client_id?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          is_current?: boolean
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          client_id: string
          created_at: string
          description: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description: string
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avg_bill: number | null
          code: number
          created_at: string
          created_by: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          last_contact_at: string | null
          next_contact_at: string | null
          notes: string | null
          origin: string
          responsible_id: string | null
          status: Database["public"]["Enums"]["client_status"]
          stopped_responding: boolean
          updated_at: string
          whatsapp: string
        }
        Insert: {
          avg_bill?: number | null
          code?: number
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          last_contact_at?: string | null
          next_contact_at?: string | null
          notes?: string | null
          origin: string
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          stopped_responding?: boolean
          updated_at?: string
          whatsapp: string
        }
        Update: {
          avg_bill?: number | null
          code?: number
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          last_contact_at?: string | null
          next_contact_at?: string | null
          notes?: string | null
          origin?: string
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          stopped_responding?: boolean
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          event_id: string | null
          fbc: string | null
          fbp: string | null
          id: string
          ip_address: string | null
          name: string
          order_bump_active: boolean
          source: string | null
          total_price: number
          user_agent: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          ip_address?: string | null
          name: string
          order_bump_active?: boolean
          source?: string | null
          total_price: number
          user_agent?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          order_bump_active?: boolean
          source?: string | null
          total_price?: number
          user_agent?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      monthly_revenues: {
        Row: {
          bill_amount: number
          client_id: string
          created_at: string
          id: string
          is_estimate: boolean
          notes: string | null
          percent: number
          receipt_status: string
          reference_month: string
          revenue: number | null
        }
        Insert: {
          bill_amount: number
          client_id: string
          created_at?: string
          id?: string
          is_estimate?: boolean
          notes?: string | null
          percent?: number
          receipt_status?: string
          reference_month: string
          revenue?: number | null
        }
        Update: {
          bill_amount?: number
          client_id?: string
          created_at?: string
          id?: string
          is_estimate?: boolean
          notes?: string | null
          percent?: number
          receipt_status?: string
          reference_month?: string
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_revenues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      public_registration_leads: {
        Row: {
          city: string
          created_at: string
          full_name: string
          id: string
          source: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          city: string
          created_at?: string
          full_name: string
          id?: string
          source?: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          source?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      can_access_client: { Args: { _client: string }; Returns: boolean }
      find_duplicates: {
        Args: { _email: string; _exclude?: string; _whatsapp: string }
        Returns: {
          code: number
          full_name: string
          id: string
          match: string
          status: Database["public"]["Enums"]["client_status"]
        }[]
      }
      generate_monthly_revenues: { Args: { _month: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "equipe"
      client_status:
        | "novo"
        | "primeiro_contato"
        | "aguardando_documentos"
        | "documentos_recebidos"
        | "documentos_em_analise"
        | "cadastro_concluido"
        | "cliente_ativo"
        | "cliente_inativo"
        | "nao_prosseguiu"
        | "cadastro_duplicado"
      doc_status:
        | "pendente"
        | "recebido"
        | "em_analise"
        | "aprovado"
        | "rejeitado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "equipe"],
      client_status: [
        "novo",
        "primeiro_contato",
        "aguardando_documentos",
        "documentos_recebidos",
        "documentos_em_analise",
        "cadastro_concluido",
        "cliente_ativo",
        "cliente_inativo",
        "nao_prosseguiu",
        "cadastro_duplicado",
      ],
      doc_status: [
        "pendente",
        "recebido",
        "em_analise",
        "aprovado",
        "rejeitado",
      ],
    },
  },
} as const
