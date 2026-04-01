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
      absences: {
        Row: {
          absence_type: string
          created_at: string
          end_date: string
          id: string
          notes: string | null
          staff_id: string
          start_date: string
        }
        Insert: {
          absence_type: string
          created_at?: string
          end_date: string
          id?: string
          notes?: string | null
          staff_id: string
          start_date: string
        }
        Update: {
          absence_type?: string
          created_at?: string
          end_date?: string
          id?: string
          notes?: string | null
          staff_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "mv_daily_summary"
            referencedColumns: ["session_id"]
          },
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
          from_hour: number | null
          holiday_date: string
          id: string
          name: string
          surcharge_rate: number
        }
        Insert: {
          created_at?: string
          from_hour?: number | null
          holiday_date: string
          id?: string
          name: string
          surcharge_rate?: number
        }
        Update: {
          created_at?: string
          from_hour?: number | null
          holiday_date?: string
          id?: string
          name?: string
          surcharge_rate?: number
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
      employee_skills: {
        Row: {
          id: string
          skill_id: string
          staff_id: string
        }
        Insert: {
          id?: string
          skill_id: string
          staff_id: string
        }
        Update: {
          id?: string
          skill_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
            referencedRelation: "mv_daily_summary"
            referencedColumns: ["session_id"]
          },
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
          staff_id: string | null
          staff_name: string
        }
        Insert: {
          created_at?: string
          hours_worked?: number | null
          id?: string
          session_id: string
          shift_end: string
          shift_start: string
          staff_id?: string | null
          staff_name: string
        }
        Update: {
          created_at?: string
          hours_worked?: number | null
          id?: string
          session_id?: string
          shift_end?: string
          shift_start?: string
          staff_id?: string | null
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_shifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "kitchen_shifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
      payroll_calculations: {
        Row: {
          created_at: string
          created_by_name: string | null
          date_from: string
          date_to: string
          external_results: Json | null
          id: string
          label: string | null
          pdf_path: string | null
          period_id: string
          results: Json
          sfn_mode: string
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          date_from: string
          date_to: string
          external_results?: Json | null
          id?: string
          label?: string | null
          pdf_path?: string | null
          period_id: string
          results?: Json
          sfn_mode?: string
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          date_from?: string
          date_to?: string
          external_results?: Json | null
          id?: string
          label?: string | null
          pdf_path?: string | null
          period_id?: string
          results?: Json
          sfn_mode?: string
        }
        Relationships: []
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
      payroll_office_settings: {
        Row: {
          created_at: string
          id: string
          pin_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_code?: string
          updated_at?: string
        }
        Relationships: []
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
          share_token: string | null
          shared_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["period_status"]
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          label: string
          restaurant_id?: string | null
          share_token?: string | null
          shared_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["period_status"]
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          restaurant_id?: string | null
          share_token?: string | null
          shared_at?: string | null
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
          is_unlocked: boolean
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
          unlocked_at: string | null
          unlocked_by_name: string | null
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
          is_unlocked?: boolean
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
          unlocked_at?: string | null
          unlocked_by_name?: string | null
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
          is_unlocked?: boolean
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
          unlocked_at?: string | null
          unlocked_by_name?: string | null
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
      shift_assignments: {
        Row: {
          assigned_skill_id: string | null
          created_at: string
          department: string
          end_time: string | null
          id: string
          notes: string | null
          restaurant_id: string
          shift_date: string
          staff_id: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          assigned_skill_id?: string | null
          created_at?: string
          department: string
          end_time?: string | null
          id?: string
          notes?: string | null
          restaurant_id: string
          shift_date: string
          staff_id: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          assigned_skill_id?: string | null
          created_at?: string
          department?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string
          shift_date?: string
          staff_id?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_assigned_skill_id_fkey"
            columns: ["assigned_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category: string
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      sofortmeldung: {
        Row: {
          created_at: string
          created_by_name: string | null
          error_message: string | null
          export_format: string | null
          exported_at: string | null
          id: string
          missing_fields: Json | null
          reported_at: string | null
          sofortmeldung_required: boolean | null
          staff_id: string
          status: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          error_message?: string | null
          export_format?: string | null
          exported_at?: string | null
          id?: string
          missing_fields?: Json | null
          reported_at?: string | null
          sofortmeldung_required?: boolean | null
          staff_id: string
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          error_message?: string | null
          export_format?: string | null
          exported_at?: string | null
          id?: string
          missing_fields?: Json | null
          reported_at?: string | null
          sofortmeldung_required?: boolean | null
          staff_id?: string
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sofortmeldung_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sofortmeldung_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          new_status: string | null
          old_status: string | null
          performed_by_name: string | null
          sofortmeldung_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          performed_by_name?: string | null
          sofortmeldung_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          performed_by_name?: string | null
          sofortmeldung_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sofortmeldung_log_sofortmeldung_id_fkey"
            columns: ["sofortmeldung_id"]
            isOneToOne: false
            referencedRelation: "sofortmeldung"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          activity_description: string | null
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          bank_name: string | null
          bic: string | null
          contracted_hours_per_month: number | null
          created_at: string
          date_of_birth: string | null
          employment_end: string | null
          employment_start: string | null
          employment_type: string | null
          first_name: string | null
          health_insurance: string | null
          hourly_rate: number | null
          iban: string | null
          id: string
          is_active: boolean | null
          is_minijob: boolean | null
          is_sv_exempt: boolean | null
          last_name: string | null
          name: string
          nationality: string | null
          nickname: string | null
          notes: string | null
          participates_in_pool: boolean
          perso_nr: number | null
          personnel_group: string | null
          role: Database["public"]["Enums"]["staff_role"]
          sick_days_total: number | null
          social_security_nr: string | null
          tax_class: string | null
          tax_id: string | null
          updated_at: string
          vacation_days_contractual: number | null
          vacation_days_current: number | null
          vacation_days_previous: number | null
          vacation_days_taken: number | null
          work_start_time: string | null
        }
        Insert: {
          activity_description?: string | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_name?: string | null
          bic?: string | null
          contracted_hours_per_month?: number | null
          created_at?: string
          date_of_birth?: string | null
          employment_end?: string | null
          employment_start?: string | null
          employment_type?: string | null
          first_name?: string | null
          health_insurance?: string | null
          hourly_rate?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_minijob?: boolean | null
          is_sv_exempt?: boolean | null
          last_name?: string | null
          name: string
          nationality?: string | null
          nickname?: string | null
          notes?: string | null
          participates_in_pool?: boolean
          perso_nr?: number | null
          personnel_group?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          sick_days_total?: number | null
          social_security_nr?: string | null
          tax_class?: string | null
          tax_id?: string | null
          updated_at?: string
          vacation_days_contractual?: number | null
          vacation_days_current?: number | null
          vacation_days_previous?: number | null
          vacation_days_taken?: number | null
          work_start_time?: string | null
        }
        Update: {
          activity_description?: string | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          bank_name?: string | null
          bic?: string | null
          contracted_hours_per_month?: number | null
          created_at?: string
          date_of_birth?: string | null
          employment_end?: string | null
          employment_start?: string | null
          employment_type?: string | null
          first_name?: string | null
          health_insurance?: string | null
          hourly_rate?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_minijob?: boolean | null
          is_sv_exempt?: boolean | null
          last_name?: string | null
          name?: string
          nationality?: string | null
          nickname?: string | null
          notes?: string | null
          participates_in_pool?: boolean
          perso_nr?: number | null
          personnel_group?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          sick_days_total?: number | null
          social_security_nr?: string | null
          tax_class?: string | null
          tax_id?: string | null
          updated_at?: string
          vacation_days_contractual?: number | null
          vacation_days_current?: number | null
          vacation_days_previous?: number | null
          vacation_days_taken?: number | null
          work_start_time?: string | null
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
          report_time: string
          show_cash_balance: boolean | null
          show_cash_details: boolean | null
          show_created_by: boolean | null
          show_guest_count: boolean | null
          show_kitchen: boolean | null
          show_notes: boolean | null
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
          report_time?: string
          show_cash_balance?: boolean | null
          show_cash_details?: boolean | null
          show_created_by?: boolean | null
          show_guest_count?: boolean | null
          show_kitchen?: boolean | null
          show_notes?: boolean | null
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
          report_time?: string
          show_cash_balance?: boolean | null
          show_cash_details?: boolean | null
          show_created_by?: boolean | null
          show_guest_count?: boolean | null
          show_kitchen?: boolean | null
          show_notes?: boolean | null
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
          staff_id: string | null
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
          staff_id?: string | null
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
          staff_id?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          waiter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_shifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_daily_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "waiter_shifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
          night_deep_hours: number
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
          night_deep_hours?: number
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
          night_deep_hours?: number
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
      zt_sync_logs: {
        Row: {
          created_at: string
          id: string
          reason: string
          restaurant_id: string
          session_date: string
          source: string
          staff_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          restaurant_id: string
          session_date: string
          source?: string
          staff_name: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          restaurant_id?: string
          session_date?: string
          source?: string
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "zt_sync_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_daily_summary: {
        Row: {
          card_total: number | null
          created_by_name: string | null
          einladung: number | null
          finedine_vouchers: number | null
          guest_count: number | null
          kitchen_staff_count: number | null
          notes: string | null
          ordersmart_revenue: number | null
          pos_total: number | null
          restaurant_id: string | null
          session_date: string | null
          session_id: string | null
          sonstige_einnahme: number | null
          takeaway_total: number | null
          total_advances: number | null
          total_differenz: number | null
          total_expenses: number | null
          total_kitchen_hours: number | null
          total_kitchen_tip: number | null
          total_waiter_hours: number | null
          total_waiter_sales: number | null
          vouchers_redeemed: number | null
          vouchers_sold: number | null
          waiter_count: number | null
          wolt_revenue: number | null
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
    }
    Functions: {
      check_duplicate_staff_name: {
        Args: { p_exclude_id?: string; p_name: string }
        Returns: {
          error_message: string
          exists: boolean
        }[]
      }
      cleanup_old_records: { Args: never; Returns: undefined }
      compute_carry_over: {
        Args: { p_before_date: string; p_restaurant_id: string }
        Returns: number
      }
      get_staff_permission: {
        Args: { p_staff_id: string }
        Returns: Database["public"]["Enums"]["app_permission_level"]
      }
      update_telegram_cron_schedule: {
        Args: { p_time: string }
        Returns: undefined
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
