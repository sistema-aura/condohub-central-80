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
      assembleias: {
        Row: {
          ata_data: string | null
          ata_feita: boolean
          ata_fracoes: Json
          ata_numero: string | null
          ata_pdf_nome: string | null
          ata_pdf_path: string | null
          avisada_convocatoria: boolean
          avisada_reuniao: boolean
          cancelada: boolean
          cancelamento_motivo: string | null
          convocatoria_enviada: boolean
          created_at: string
          created_by: string | null
          data_hora: string
          edificio_id: string
          id: string
          local: string | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ata_data?: string | null
          ata_feita?: boolean
          ata_fracoes?: Json
          ata_numero?: string | null
          ata_pdf_nome?: string | null
          ata_pdf_path?: string | null
          avisada_convocatoria?: boolean
          avisada_reuniao?: boolean
          cancelada?: boolean
          cancelamento_motivo?: string | null
          convocatoria_enviada?: boolean
          created_at?: string
          created_by?: string | null
          data_hora: string
          edificio_id: string
          id?: string
          local?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ata_data?: string | null
          ata_feita?: boolean
          ata_fracoes?: Json
          ata_numero?: string | null
          ata_pdf_nome?: string | null
          ata_pdf_path?: string | null
          avisada_convocatoria?: boolean
          avisada_reuniao?: boolean
          cancelada?: boolean
          cancelamento_motivo?: string | null
          convocatoria_enviada?: boolean
          created_at?: string
          created_by?: string | null
          data_hora?: string
          edificio_id?: string
          id?: string
          local?: string | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembleias_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          created_at: string
          dia: string
          feito: boolean
          id: string
          pessoa: string
          texto: string
        }
        Insert: {
          created_at?: string
          dia?: string
          feito?: boolean
          id?: string
          pessoa?: string
          texto: string
        }
        Update: {
          created_at?: string
          dia?: string
          feito?: boolean
          id?: string
          pessoa?: string
          texto?: string
        }
        Relationships: []
      }
      declaracoes: {
        Row: {
          created_at: string
          created_by: string | null
          edificio_id: string
          feita: boolean
          feita_em: string | null
          fracao: string | null
          fundo_reserva: string | null
          id: string
          nif: string | null
          observacoes: string | null
          proprietario: string | null
          quota_extraordinaria: string | null
          quota_mensal: string | null
          quota_seguro: string | null
          reconhecida: boolean
          reconhecimento_estado: string
          updated_at: string
          urgente: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edificio_id: string
          feita?: boolean
          feita_em?: string | null
          fracao?: string | null
          fundo_reserva?: string | null
          id?: string
          nif?: string | null
          observacoes?: string | null
          proprietario?: string | null
          quota_extraordinaria?: string | null
          quota_mensal?: string | null
          quota_seguro?: string | null
          reconhecida?: boolean
          reconhecimento_estado?: string
          updated_at?: string
          urgente?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edificio_id?: string
          feita?: boolean
          feita_em?: string | null
          fracao?: string | null
          fundo_reserva?: string | null
          id?: string
          nif?: string | null
          observacoes?: string | null
          proprietario?: string | null
          quota_extraordinaria?: string | null
          quota_mensal?: string | null
          quota_seguro?: string | null
          reconhecida?: boolean
          reconhecimento_estado?: string
          updated_at?: string
          urgente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "declaracoes_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          avisada_validade: boolean
          created_at: string
          created_by: string | null
          data_documento: string | null
          data_validade: string | null
          edificio_id: string
          ficheiro_nome: string | null
          ficheiro_path: string | null
          id: string
          informacao: string | null
          mime_type: string | null
          tamanho: number | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          titulo: string
          updated_at: string
        }
        Insert: {
          avisada_validade?: boolean
          created_at?: string
          created_by?: string | null
          data_documento?: string | null
          data_validade?: string | null
          edificio_id: string
          ficheiro_nome?: string | null
          ficheiro_path?: string | null
          id?: string
          informacao?: string | null
          mime_type?: string | null
          tamanho?: number | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          titulo: string
          updated_at?: string
        }
        Update: {
          avisada_validade?: boolean
          created_at?: string
          created_by?: string | null
          data_documento?: string | null
          data_validade?: string | null
          edificio_id?: string
          ficheiro_nome?: string | null
          ficheiro_path?: string | null
          id?: string
          informacao?: string | null
          mime_type?: string | null
          tamanho?: number | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
        ]
      }
      edificios: {
        Row: {
          ativo: boolean
          banco_codigo_acesso: string | null
          banco_pin: string | null
          codigo_postal: string | null
          created_at: string
          created_by: string | null
          fracoes_ata: Json
          id: string
          identificacao_interna: string | null
          localidade: string | null
          morada: string | null
          nome: string
          observacoes: string | null
          quantidade_fracoes: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          banco_codigo_acesso?: string | null
          banco_pin?: string | null
          codigo_postal?: string | null
          created_at?: string
          created_by?: string | null
          fracoes_ata?: Json
          id?: string
          identificacao_interna?: string | null
          localidade?: string | null
          morada?: string | null
          nome: string
          observacoes?: string | null
          quantidade_fracoes?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          banco_codigo_acesso?: string | null
          banco_pin?: string | null
          codigo_postal?: string | null
          created_at?: string
          created_by?: string | null
          fracoes_ata?: Json
          id?: string
          identificacao_interna?: string | null
          localidade?: string | null
          morada?: string | null
          nome?: string
          observacoes?: string | null
          quantidade_fracoes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_avisados: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      propostas: {
        Row: {
          created_at: string
          created_by: string | null
          dados: Json
          id: string
          morada: string | null
          nome: string | null
          numero: string | null
          total_com_iva: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados: Json
          id?: string
          morada?: string | null
          nome?: string | null
          numero?: string | null
          total_com_iva?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          id?: string
          morada?: string | null
          nome?: string | null
          numero?: string | null
          total_com_iva?: number | null
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          avisar_pessoas: string[] | null
          concluida_em: string | null
          created_at: string
          created_by: string | null
          de_pessoa: string
          descricao: string | null
          edificio_id: string | null
          estado: string
          id: string
          para_pessoa: string
          prazo: string | null
          prioridade: boolean
          respostas: Json
          titulo: string
          updated_at: string
        }
        Insert: {
          avisar_pessoas?: string[] | null
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          de_pessoa: string
          descricao?: string | null
          edificio_id?: string | null
          estado?: string
          id?: string
          para_pessoa: string
          prazo?: string | null
          prioridade?: boolean
          respostas?: Json
          titulo: string
          updated_at?: string
        }
        Update: {
          avisar_pessoas?: string[] | null
          concluida_em?: string | null
          created_at?: string
          created_by?: string | null
          de_pessoa?: string
          descricao?: string | null
          edificio_id?: string | null
          estado?: string
          id?: string
          para_pessoa?: string
          prazo?: string | null
          prioridade?: boolean
          respostas?: Json
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_config: {
        Row: {
          chat_id: number
          chat_title: string | null
          created_at: string
          id: number
        }
        Insert: {
          chat_id: number
          chat_title?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          chat_id?: number
          chat_title?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      vistorias: {
        Row: {
          avisar_pessoas: string[]
          concluida: boolean
          created_at: string
          created_by: string | null
          data: string
          edificio_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          notas: string | null
          pessoa: string
        }
        Insert: {
          avisar_pessoas?: string[]
          concluida?: boolean
          created_at?: string
          created_by?: string | null
          data?: string
          edificio_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          notas?: string | null
          pessoa?: string
        }
        Update: {
          avisar_pessoas?: string[]
          concluida?: boolean
          created_at?: string
          created_by?: string | null
          data?: string
          edificio_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          notas?: string | null
          pessoa?: string
        }
        Relationships: [
          {
            foreignKeyName: "vistorias_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_avisos_token: { Args: { _token: string }; Returns: boolean }
    }
    Enums: {
      tipo_documento:
        | "luz"
        | "agua"
        | "banco"
        | "elevador"
        | "seguro"
        | "outros"
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
      tipo_documento: ["luz", "agua", "banco", "elevador", "seguro", "outros"],
    },
  },
} as const
