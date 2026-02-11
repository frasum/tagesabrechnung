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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      advances: {
        Row: {
          amount: number
          created_at: string
          id: string
          session_id: string
          staff_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          session_id: string
          staff_name: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          session_id?: string
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "advances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_by_id: string | null
          changed_by_name: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          restaurant_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by_id?: string | null
          changed_by_name: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          restaurant_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by_id?: string | null
          changed_by_name?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          restaurant_id?: string
          table_name?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          attempted_at: string
          id: string
          identifier: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      bank_deposits: {
        Row: {
          amount: number
          created_at: string
          deposit_date: string
          id: string
          notes: string | null
          restaurant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deposit_date: string
          id?: string
          notes?: string | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deposit_date?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_deposits_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      card_transactions: {
        Row: {
          amount: number
          card_type: string
          created_at: string
          id: string
          waiter_shift_id: string
        }
        Insert: {
          amount: number
          card_type: string
          created_at?: string
          id?: string
          waiter_shift_id: string
        }
        Update: {
          amount?: number
          card_type?: string
          created_at?: string
          id?: string
          waiter_shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_transactions_waiter_shift_id_fkey"
            columns: ["waiter_shift_id"]
            isOneToOne: false
            referencedRelation: "waiter_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_shifts: {
        Row: {
          created_at: string
          hours_worked: number | null
          id: string
          session_id: string
          shift_end: string
          shift_start: string
          staff_name: string
        }
        Insert: {
          created_at?: string
          hours_worked?: number | null
          id?: string
          session_id: string
          shift_end: string
          shift_start: string
          staff_name: string
        }
        Update: {
          created_at?: string
          hours_worked?: number | null
          id?: string
          session_id?: string
          shift_end?: string
          shift_start?: string
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_shifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_confirmations: {
        Row: {
          confirmed_at: string | null
          confirmed_ip: string | null
          created_at: string
          expires_at: string
          id: string
          staff_id: string
          token: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_ip?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          staff_id: string
          token?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_ip?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          staff_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_confirmations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_nav_permissions: {
        Row: {
          created_at: string
          id: string
          nav_path: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nav_path: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nav_path?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_nav_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_restaurant_id: string | null
          staff_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_restaurant_id?: string | null
          staff_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_restaurant_id?: string | null
          staff_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_restaurant_id_fkey"
            columns: ["preferred_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      register_transfers: {
        Row: {
          amount: number
          created_at: string
          created_by_name: string | null
          direction: string
          id: string
          reason: string | null
          restaurant_id: string
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_name?: string | null
          direction: string
          id?: string
          reason?: string | null
          restaurant_id: string
          transfer_date: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_name?: string | null
          direction?: string
          id?: string
          reason?: string | null
          restaurant_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "register_transfers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          initial_cash_deficit: number | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_cash_deficit?: number | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_cash_deficit?: number | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          card_total_gl: number | null
          created_at: string
          created_by_name: string | null
          einladung: number | null
          finedine_vouchers: number | null
          guest_count: number | null
          id: string
          is_finalized: boolean | null
          notes: string | null
          ordersmart_revenue: number | null
          pos_total: number | null
          restaurant_id: string
          session_date: string
          sonstige_einnahme: number | null
          spicery_counter: number | null
          spicery_transactions: number | null
          takeaway_total: number | null
          terminal_1_total: number | null
          terminal_2_total: number | null
          updated_at: string
          updated_by_name: string | null
          vorschuss: number | null
          vouchers_redeemed: number | null
          vouchers_sold: number | null
          wolt_revenue: number | null
        }
        Insert: {
          card_total_gl?: number | null
          created_at?: string
          created_by_name?: string | null
          einladung?: number | null
          finedine_vouchers?: number | null
          guest_count?: number | null
          id?: string
          is_finalized?: boolean | null
          notes?: string | null
          ordersmart_revenue?: number | null
          pos_total?: number | null
          restaurant_id: string
          session_date: string
          sonstige_einnahme?: number | null
          spicery_counter?: number | null
          spicery_transactions?: number | null
          takeaway_total?: number | null
          terminal_1_total?: number | null
          terminal_2_total?: number | null
          updated_at?: string
          updated_by_name?: string | null
          vorschuss?: number | null
          vouchers_redeemed?: number | null
          vouchers_sold?: number | null
          wolt_revenue?: number | null
        }
        Update: {
          card_total_gl?: number | null
          created_at?: string
          created_by_name?: string | null
          einladung?: number | null
          finedine_vouchers?: number | null
          guest_count?: number | null
          id?: string
          is_finalized?: boolean | null
          notes?: string | null
          ordersmart_revenue?: number | null
          pos_total?: number | null
          restaurant_id?: string
          session_date?: string
          sonstige_einnahme?: number | null
          spicery_counter?: number | null
          spicery_transactions?: number | null
          takeaway_total?: number | null
          terminal_1_total?: number | null
          terminal_2_total?: number | null
          updated_at?: string
          updated_by_name?: string | null
          vorschuss?: number | null
          vouchers_redeemed?: number | null
          vouchers_sold?: number | null
          wolt_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          restaurant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          restaurant_id: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          restaurant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Relationships: []
      }
      staff_pins: {
        Row: {
          created_at: string
          id: string
          pin_code: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_code: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_code?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_pins_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_restaurants: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_restaurants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_restaurants_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          permission_level: Database["public"]["Enums"]["app_permission_level"]
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_level?: Database["public"]["Enums"]["app_permission_level"]
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_level?: Database["public"]["Enums"]["app_permission_level"]
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      waiter_shifts: {
        Row: {
          card_total: number | null
          cash_handed_in: number | null
          created_at: string
          differenz: number | null
          hilf_mahl: number | null
          id: string
          kassiert_brutto: number | null
          kitchen_tip: number | null
          open_invoices: number | null
          participates_in_pool: boolean
          pos_sales: number | null
          second_waiter_name: string | null
          session_id: string
          submitted_at: string | null
          updated_at: string | null
          waiter_name: string
        }
        Insert: {
          card_total?: number | null
          cash_handed_in?: number | null
          created_at?: string
          differenz?: number | null
          hilf_mahl?: number | null
          id?: string
          kassiert_brutto?: number | null
          kitchen_tip?: number | null
          open_invoices?: number | null
          participates_in_pool?: boolean
          pos_sales?: number | null
          second_waiter_name?: string | null
          session_id: string
          submitted_at?: string | null
          updated_at?: string | null
          waiter_name: string
        }
        Update: {
          card_total?: number | null
          cash_handed_in?: number | null
          created_at?: string
          differenz?: number | null
          hilf_mahl?: number | null
          id?: string
          kassiert_brutto?: number | null
          kitchen_tip?: number | null
          open_invoices?: number | null
          participates_in_pool?: boolean
          pos_sales?: number | null
          second_waiter_name?: string | null
          session_id?: string
          submitted_at?: string | null
          updated_at?: string | null
          waiter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_shifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_staff_permission: {
        Args: { p_staff_id: string }
        Returns: Database["public"]["Enums"]["app_permission_level"]
      }
    }
    Enums: {
      app_permission_level: "staff" | "manager" | "admin"
      staff_role: "waiter" | "kitchen" | "both"
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
      app_permission_level: ["staff", "manager", "admin"],
      staff_role: ["waiter", "kitchen", "both"],
    },
  },
} as const
