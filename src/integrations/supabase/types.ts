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
      bavarian_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
        }
        Relationships: []
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
      daily_revenue: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          revenue_date: string
          total_revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          revenue_date: string
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          revenue_date?: string
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_revenue_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      payroll_notes: {
        Row: {
          besonderheiten: string | null
          created_at: string
          employee_id: string
          id: string
          period_id: string
          updated_at: string
          urlaub_tage: number
          vorschuss: number
        }
        Insert: {
          besonderheiten?: string | null
          created_at?: string
          employee_id: string
          id?: string
          period_id: string
          updated_at?: string
          urlaub_tage?: number
          vorschuss?: number
        }
        Update: {
          besonderheiten?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          period_id?: string
          updated_at?: string
          urlaub_tage?: number
          vorschuss?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_notes_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "scheduling_periods"
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
          ordersmart_in_takeaway: boolean
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          initial_cash_deficit?: number | null
          name: string
          ordersmart_in_takeaway?: boolean
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          initial_cash_deficit?: number | null
          name?: string
          ordersmart_in_takeaway?: boolean
          slug?: string
        }
        Relationships: []
      }
      scheduling_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          label: string
          restaurant_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["period_status"]
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          label: string
          restaurant_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["period_status"]
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          restaurant_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["period_status"]
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          last_settlement_sent_at: string | null
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
          last_settlement_sent_at?: string | null
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
          last_settlement_sent_at?: string | null
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
          first_name: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          last_name: string | null
          name: string
          nickname: string | null
          notes: string | null
          perso_nr: number | null
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          name: string
          nickname?: string | null
          notes?: string | null
          perso_nr?: number | null
          role: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          name?: string
          nickname?: string | null
          notes?: string | null
          perso_nr?: number | null
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
          zt_department: Database["public"]["Enums"]["zt_department"] | null
          zt_hourly_rate: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          staff_id: string
          zt_department?: Database["public"]["Enums"]["zt_department"] | null
          zt_hourly_rate?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          staff_id?: string
          zt_department?: Database["public"]["Enums"]["zt_department"] | null
          zt_hourly_rate?: number | null
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
      telegram_settings: {
        Row: {
          bot_token: string
          chat_id: string
          created_at: string | null
          excluded_restaurants: string[] | null
          id: string
          show_cash_balance: boolean | null
          show_cash_details: boolean | null
          show_created_by: boolean | null
          show_guest_count: boolean | null
          show_kitchen: boolean | null
          show_pdf_export_notification: boolean | null
          show_pos_total: boolean | null
          show_waiters: boolean | null
          updated_at: string | null
        }
        Insert: {
          bot_token?: string
          chat_id?: string
          created_at?: string | null
          excluded_restaurants?: string[] | null
          id?: string
          show_cash_balance?: boolean | null
          show_cash_details?: boolean | null
          show_created_by?: boolean | null
          show_guest_count?: boolean | null
          show_kitchen?: boolean | null
          show_pdf_export_notification?: boolean | null
          show_pos_total?: boolean | null
          show_waiters?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bot_token?: string
          chat_id?: string
          created_at?: string | null
          excluded_restaurants?: string[] | null
          id?: string
          show_cash_balance?: boolean | null
          show_cash_details?: boolean | null
          show_created_by?: boolean | null
          show_guest_count?: boolean | null
          show_kitchen?: boolean | null
          show_pdf_export_notification?: boolean | null
          show_pos_total?: boolean | null
          show_waiters?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
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
          additional_waiters: string[]
          card_total: number | null
          cash_handed_in: number | null
          created_at: string
          differenz: number | null
          hilf_mahl: number | null
          hours_worked: number | null
          id: string
          kassiert_brutto: number | null
          kitchen_tip: number | null
          open_invoices: number | null
          participates_in_pool: boolean
          pos_sales: number | null
          second_waiter_name: string | null
          session_id: string
          shift_end: string | null
          shift_start: string | null
          submitted_at: string | null
          updated_at: string | null
          waiter_name: string
        }
        Insert: {
          additional_waiters?: string[]
          card_total?: number | null
          cash_handed_in?: number | null
          created_at?: string
          differenz?: number | null
          hilf_mahl?: number | null
          hours_worked?: number | null
          id?: string
          kassiert_brutto?: number | null
          kitchen_tip?: number | null
          open_invoices?: number | null
          participates_in_pool?: boolean
          pos_sales?: number | null
          second_waiter_name?: string | null
          session_id: string
          shift_end?: string | null
          shift_start?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          waiter_name: string
        }
        Update: {
          additional_waiters?: string[]
          card_total?: number | null
          cash_handed_in?: number | null
          created_at?: string
          differenz?: number | null
          hilf_mahl?: number | null
          hours_worked?: number | null
          id?: string
          kassiert_brutto?: number | null
          kitchen_tip?: number | null
          open_invoices?: number | null
          participates_in_pool?: boolean
          pos_sales?: number | null
          second_waiter_name?: string | null
          session_id?: string
          shift_end?: string | null
          shift_start?: string | null
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
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          staff_id: string | null
          type: string
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          staff_id?: string | null
          type: string
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          staff_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_challenges_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          public_key: string
          staff_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          public_key: string
          staff_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          public_key?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_credentials_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          created_at: string
          end_date: string
          id: string
          period_id: string
          start_date: string
          week_number: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          period_id: string
          start_date: string
          week_number: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          period_id?: string
          start_date?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weeks_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "scheduling_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      zt_shifts: {
        Row: {
          absence_type: string | null
          created_at: string
          department: string
          employee_id: string
          end_time: string | null
          evening_hours: number
          id: string
          is_holiday: boolean
          night_hours: number
          shift_date: string
          start_time: string | null
          sunday_holiday_hours: number
          total_hours: number
          updated_at: string
          week_id: string
        }
        Insert: {
          absence_type?: string | null
          created_at?: string
          department?: string
          employee_id: string
          end_time?: string | null
          evening_hours?: number
          id?: string
          is_holiday?: boolean
          night_hours?: number
          shift_date: string
          start_time?: string | null
          sunday_holiday_hours?: number
          total_hours?: number
          updated_at?: string
          week_id: string
        }
        Update: {
          absence_type?: string | null
          created_at?: string
          department?: string
          employee_id?: string
          end_time?: string | null
          evening_hours?: number
          id?: string
          is_holiday?: boolean
          night_hours?: number
          shift_date?: string
          start_time?: string | null
          sunday_holiday_hours?: number
          total_hours?: number
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zt_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zt_shifts_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_duplicate_staff_name: {
        Args: { p_exclude_id?: string; p_name: string }
        Returns: {
          error_message: string
          exists: boolean
        }[]
      }
      compute_carry_over: {
        Args: { p_before_date: string; p_restaurant_id: string }
        Returns: number
      }
      get_staff_permission: {
        Args: { p_staff_id: string }
        Returns: Database["public"]["Enums"]["app_permission_level"]
      }
    }
    Enums: {
      app_permission_level: "staff" | "manager" | "admin"
      period_status: "open" | "locked"
      staff_role:
        | "waiter"
        | "kitchen"
        | "both"
        | "gl"
        | "waiter_gl"
        | "kitchen_gl"
        | "all"
      zt_department: "Küche" | "GL" | "Service"
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
      period_status: ["open", "locked"],
      staff_role: [
        "waiter",
        "kitchen",
        "both",
        "gl",
        "waiter_gl",
        "kitchen_gl",
        "all",
      ],
      zt_department: ["Küche", "GL", "Service"],
    },
  },
} as const
