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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blind_structure_config: {
        Row: {
          id: string
          late_registration_end_index: number
          structure: Json
          updated_at: string
        }
        Insert: {
          id?: string
          late_registration_end_index?: number
          structure: Json
          updated_at?: string
        }
        Update: {
          id?: string
          late_registration_end_index?: number
          structure?: Json
          updated_at?: string
        }
        Relationships: []
      }
      manutencao_keep_alive: {
        Row: {
          executado_em: string
        }
        Insert: {
          executado_em?: string
        }
        Update: {
          executado_em?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id: string
          last_name?: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          created_at: string | null
          id: string
          player_name: string | null
          position: number | null
          reentry_count: number
          stack: number | null
          status: Database["public"]["Enums"]["registration_status"]
          table_number: number | null
          tournament_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_name?: string | null
          position?: number | null
          reentry_count?: number
          stack?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          table_number?: number | null
          tournament_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_name?: string | null
          position?: number | null
          reentry_count?: number
          stack?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          table_number?: number | null
          tournament_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          buy_in: number
          created_at: string | null
          current_blind_index: number | null
          date: string
          id: string
          initial_stack: number
          location: string | null
          max_players: number
          name: string
          num_tables: number | null
          prize_pool: number | null
          reentry_fee: number
          reentry_stack: number
          status: Database["public"]["Enums"]["tournament_status"]
          table_names: Json | null
          time: string
          timer_running: boolean | null
          timer_seconds_left: number | null
          timer_updated_at: string | null
          total_chips_override: number | null
          total_players: number | null
        }
        Insert: {
          buy_in?: number
          created_at?: string | null
          current_blind_index?: number | null
          date: string
          id?: string
          initial_stack?: number
          location?: string | null
          max_players?: number
          name: string
          num_tables?: number | null
          prize_pool?: number | null
          reentry_fee?: number
          reentry_stack?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          table_names?: Json | null
          time?: string
          timer_running?: boolean | null
          timer_seconds_left?: number | null
          timer_updated_at?: string | null
          total_chips_override?: number | null
          total_players?: number | null
        }
        Update: {
          buy_in?: number
          created_at?: string | null
          current_blind_index?: number | null
          date?: string
          id?: string
          initial_stack?: number
          location?: string | null
          max_players?: number
          name?: string
          num_tables?: number | null
          prize_pool?: number | null
          reentry_fee?: number
          reentry_stack?: number
          status?: Database["public"]["Enums"]["tournament_status"]
          table_names?: Json | null
          time?: string
          timer_running?: boolean | null
          timer_seconds_left?: number | null
          timer_updated_at?: string | null
          total_chips_override?: number | null
          total_players?: number | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      create_profile_for_user: {
        Args: {
          _email: string
          _first_name: string
          _last_name: string
          _phone?: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      registration_status: "pending" | "confirmed" | "eliminated" | "reentry"
      tournament_status:
        | "pre-inscription"
        | "confirming"
        | "in-progress"
        | "finished"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
      registration_status: ["pending", "confirmed", "eliminated", "reentry"],
      tournament_status: [
        "pre-inscription",
        "confirming",
        "in-progress",
        "finished",
      ],
    },
  },
} as const
