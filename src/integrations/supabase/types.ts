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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      condominios: {
        Row: {
          ativo: boolean
          codigo_postal: string | null
          created_at: string
          created_by: string | null
          id: string
          localidade: string | null
          morada: string | null
          nome: string
          numero_interno: string | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_postal?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          localidade?: string | null
          morada?: string | null
          nome: string
          numero_interno?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_postal?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          localidade?: string | null
          morada?: string | null
          nome?: string
          numero_interno?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contactos: {
        Row: {
          condominio_id: string
          created_at: string
          email: string | null
          funcao: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          condominio_id: string
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          condominio_id?: string
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contactos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          banco: string | null
          condominio_id: string
          created_at: string
          iban: string | null
          id: string
          numero_conta: string | null
          observacoes_acesso: string | null
          site_url: string | null
          updated_at: string
        }
        Insert: {
          banco?: string | null
          condominio_id: string
          created_at?: string
          iban?: string | null
          id?: string
          numero_conta?: string | null
          observacoes_acesso?: string | null
          site_url?: string | null
          updated_at?: string
        }
        Update: {
          banco?: string | null
          condominio_id?: string
          created_at?: string
          iban?: string | null
          id?: string
          numero_conta?: string | null
          observacoes_acesso?: string | null
          site_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: true
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_eletricidade: {
        Row: {
          companhia: string | null
          condominio_id: string
          cpe: string | null
          created_at: string
          data_inicio: string | null
          id: string
          numero_contrato: string | null
          observacoes: string | null
          titular: string | null
          updated_at: string
        }
        Insert: {
          companhia?: string | null
          condominio_id: string
          cpe?: string | null
          created_at?: string
          data_inicio?: string | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
          titular?: string | null
          updated_at?: string
        }
        Update: {
          companhia?: string | null
          condominio_id?: string
          cpe?: string | null
          created_at?: string
          data_inicio?: string | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
          titular?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_eletricidade_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: true
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          condominio_id: string
          created_at: string
          id: string
          mime_type: string | null
          nome: string
          storage_path: string
          tamanho: number | null
          uploaded_by: string | null
        }
        Insert: {
          condominio_id: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome: string
          storage_path: string
          tamanho?: number | null
          uploaded_by?: string | null
        }
        Update: {
          condominio_id?: string
          created_at?: string
          id?: string
          mime_type?: string | null
          nome?: string
          storage_path?: string
          tamanho?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
      seguros: {
        Row: {
          companhia: string | null
          condominio_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          numero_apolice: string | null
          observacoes: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          companhia?: string | null
          condominio_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          numero_apolice?: string | null
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          companhia?: string | null
          condominio_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          numero_apolice?: string | null
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguros_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
