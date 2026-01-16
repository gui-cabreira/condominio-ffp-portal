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
      administrator_contacts: {
        Row: {
          active: boolean | null
          administrator_id: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          administrator_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          administrator_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "administrator_contacts_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
        ]
      }
      administrator_sync_config: {
        Row: {
          administrator_id: string
          auth_type: string | null
          auto_sync_enabled: boolean | null
          created_at: string
          id: string
          next_sync_at: string | null
          notify_on_error: boolean | null
          notify_on_success: boolean | null
          sync_frequency: string | null
          sync_time: string | null
          updated_at: string
        }
        Insert: {
          administrator_id: string
          auth_type?: string | null
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          next_sync_at?: string | null
          notify_on_error?: boolean | null
          notify_on_success?: boolean | null
          sync_frequency?: string | null
          sync_time?: string | null
          updated_at?: string
        }
        Update: {
          administrator_id?: string
          auth_type?: string | null
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          next_sync_at?: string | null
          notify_on_error?: boolean | null
          notify_on_success?: boolean | null
          sync_frequency?: string | null
          sync_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "administrator_sync_config_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
        ]
      }
      administrator_sync_logs: {
        Row: {
          administrator_id: string
          completed_at: string | null
          created_at: string
          errors: Json | null
          errors_count: number | null
          id: string
          new_charges: number | null
          new_condominiums: number | null
          new_units: number | null
          started_at: string
          status: string
          sync_type: string
          updated_charges: number | null
          updated_condominiums: number | null
          updated_units: number | null
        }
        Insert: {
          administrator_id: string
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          errors_count?: number | null
          id?: string
          new_charges?: number | null
          new_condominiums?: number | null
          new_units?: number | null
          started_at?: string
          status: string
          sync_type: string
          updated_charges?: number | null
          updated_condominiums?: number | null
          updated_units?: number | null
        }
        Update: {
          administrator_id?: string
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          errors_count?: number | null
          id?: string
          new_charges?: number | null
          new_condominiums?: number | null
          new_units?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          updated_charges?: number | null
          updated_condominiums?: number | null
          updated_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "administrator_sync_logs_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
        ]
      }
      administrators: {
        Row: {
          active: boolean | null
          address: string | null
          capital: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string
          fantasy_name: string | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          legal_name: string | null
          legal_nature: string | null
          main_activity: string | null
          management_system_id: string | null
          name: string
          neighborhood: string | null
          number: string | null
          opening_date: string | null
          phone: string | null
          portal_password: string | null
          portal_url: string | null
          portal_username: string | null
          size: string | null
          state: string | null
          status: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          capital?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          fantasy_name?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          legal_name?: string | null
          legal_nature?: string | null
          main_activity?: string | null
          management_system_id?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          opening_date?: string | null
          phone?: string | null
          portal_password?: string | null
          portal_url?: string | null
          portal_username?: string | null
          size?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          capital?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          fantasy_name?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          legal_name?: string | null
          legal_nature?: string | null
          main_activity?: string | null
          management_system_id?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          opening_date?: string | null
          phone?: string | null
          portal_password?: string | null
          portal_url?: string | null
          portal_username?: string | null
          size?: string | null
          state?: string | null
          status?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "administrators_management_system_id_fkey"
            columns: ["management_system_id"]
            isOneToOne: false
            referencedRelation: "management_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_actions: {
        Row: {
          action_type: string
          available: boolean | null
          category: string | null
          config_schema: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          action_type: string
          available?: boolean | null
          category?: string | null
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          action_type?: string
          available?: boolean | null
          category?: string | null
          config_schema?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          administrator_id: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          duration_ms: number | null
          error_message: string | null
          execution_log: Json | null
          id: string
          records_extracted: number | null
          screenshots: Json | null
          started_at: string | null
          status: string | null
          total_steps: number | null
          workflow_id: string
        }
        Insert: {
          administrator_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          duration_ms?: number | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          records_extracted?: number | null
          screenshots?: Json | null
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          workflow_id: string
        }
        Update: {
          administrator_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          duration_ms?: number | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          records_extracted?: number | null
          screenshots?: Json | null
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_statistics: {
        Row: {
          avg_duration_ms: number | null
          created_at: string
          failed_executions: number | null
          id: string
          last_execution_at: string | null
          successful_executions: number | null
          total_executions: number | null
          total_records_extracted: number | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          avg_duration_ms?: number | null
          created_at?: string
          failed_executions?: number | null
          id?: string
          last_execution_at?: string | null
          successful_executions?: number | null
          total_executions?: number | null
          total_records_extracted?: number | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          avg_duration_ms?: number | null
          created_at?: string
          failed_executions?: number | null
          id?: string
          last_execution_at?: string | null
          successful_executions?: number | null
          total_executions?: number | null
          total_records_extracted?: number | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_statistics_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          active: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          management_system_id: string | null
          name: string
          platform_name: string | null
          success_rate: number | null
          tested: boolean | null
          timeout_ms: number | null
          updated_at: string
          workflow_steps: Json | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          management_system_id?: string | null
          name: string
          platform_name?: string | null
          success_rate?: number | null
          tested?: boolean | null
          timeout_ms?: number | null
          updated_at?: string
          workflow_steps?: Json | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          management_system_id?: string | null
          name?: string
          platform_name?: string | null
          success_rate?: number | null
          tested?: boolean | null
          timeout_ms?: number | null
          updated_at?: string
          workflow_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_management_system_id_fkey"
            columns: ["management_system_id"]
            isOneToOne: false
            referencedRelation: "management_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      boleto_requests: {
        Row: {
          boleto_url: string | null
          charge_id: string
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          pix_code: string | null
          processed_at: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          boleto_url?: string | null
          charge_id: string
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pix_code?: string | null
          processed_at?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          boleto_url?: string | null
          charge_id?: string
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pix_code?: string | null
          processed_at?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boleto_requests_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_imports: {
        Row: {
          administrator_id: string | null
          completed_at: string | null
          condominium_id: string | null
          created_at: string
          errors: Json | null
          failed_imports: number | null
          file_name: string | null
          file_url: string | null
          id: string
          imported_by: string | null
          status: string | null
          successful_imports: number | null
          total_charges: number | null
        }
        Insert: {
          administrator_id?: string | null
          completed_at?: string | null
          condominium_id?: string | null
          created_at?: string
          errors?: Json | null
          failed_imports?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          imported_by?: string | null
          status?: string | null
          successful_imports?: number | null
          total_charges?: number | null
        }
        Update: {
          administrator_id?: string | null
          completed_at?: string | null
          condominium_id?: string | null
          created_at?: string
          errors?: Json | null
          failed_imports?: number | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          imported_by?: string | null
          status?: string | null
          successful_imports?: number | null
          total_charges?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "charge_imports_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_imports_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_timeline: {
        Row: {
          charge_id: string
          created_at: string
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          charge_id: string
          created_at?: string
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          charge_id?: string
          created_at?: string
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_timeline_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          administrator_id: string | null
          amount: number
          attorney_fees: number | null
          boleto_barcode: string | null
          boleto_url: string | null
          correction_amount: number | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          fees_rate: number | null
          fine_amount: number | null
          id: string
          interest_amount: number | null
          interest_rate: number | null
          last_contact_at: string | null
          metadata: Json | null
          next_action_at: string | null
          next_action_description: string | null
          payment_date: string | null
          pipeline_stage: string | null
          pix_code: string | null
          principal_amount: number | null
          reference_month: string | null
          status: Database["public"]["Enums"]["charge_status"] | null
          total_with_fees: number | null
          unit_id: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          administrator_id?: string | null
          amount: number
          attorney_fees?: number | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          correction_amount?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          fees_rate?: number | null
          fine_amount?: number | null
          id?: string
          interest_amount?: number | null
          interest_rate?: number | null
          last_contact_at?: string | null
          metadata?: Json | null
          next_action_at?: string | null
          next_action_description?: string | null
          payment_date?: string | null
          pipeline_stage?: string | null
          pix_code?: string | null
          principal_amount?: number | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["charge_status"] | null
          total_with_fees?: number | null
          unit_id: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          administrator_id?: string | null
          amount?: number
          attorney_fees?: number | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          correction_amount?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          fees_rate?: number | null
          fine_amount?: number | null
          id?: string
          interest_amount?: number | null
          interest_rate?: number | null
          last_contact_at?: string | null
          metadata?: Json | null
          next_action_at?: string | null
          next_action_description?: string | null
          payment_date?: string | null
          pipeline_stage?: string | null
          pix_code?: string | null
          principal_amount?: number | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["charge_status"] | null
          total_with_fees?: number | null
          unit_id?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_agents: {
        Row: {
          active: boolean | null
          administrator_id: string | null
          condominium_id: string | null
          created_at: string
          description: string | null
          focus_areas: Json | null
          id: string
          name: string
          personality: string
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          active?: boolean | null
          administrator_id?: string | null
          condominium_id?: string | null
          created_at?: string
          description?: string | null
          focus_areas?: Json | null
          id?: string
          name: string
          personality?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          active?: boolean | null
          administrator_id?: string | null
          condominium_id?: string | null
          created_at?: string
          description?: string | null
          focus_areas?: Json | null
          id?: string
          name?: string
          personality?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_agents_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_agents_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_image_analyses: {
        Row: {
          ai_response: string | null
          analysis_result: Json | null
          confidence: number | null
          created_at: string
          id: string
          image_url: string
          message_id: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          ai_response?: string | null
          analysis_result?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          image_url: string
          message_id?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          ai_response?: string | null
          analysis_result?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          image_url?: string
          message_id?: string | null
          session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_image_analyses_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "coaching_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_image_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_checkins: {
        Row: {
          checkin_type: string
          created_at: string
          id: string
          message_template: string | null
          phone_number: string
          responded_at: string | null
          response: string | null
          scheduled_at: string
          sent_at: string | null
          session_id: string
          status: string | null
        }
        Insert: {
          checkin_type?: string
          created_at?: string
          id?: string
          message_template?: string | null
          phone_number: string
          responded_at?: string | null
          response?: string | null
          scheduled_at: string
          sent_at?: string | null
          session_id: string
          status?: string | null
        }
        Update: {
          checkin_type?: string
          created_at?: string
          id?: string
          message_template?: string | null
          phone_number?: string
          responded_at?: string | null
          response?: string | null
          scheduled_at?: string
          sent_at?: string | null
          session_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_content: {
        Row: {
          active: boolean | null
          category: string | null
          coach_agent_id: string | null
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          coach_agent_id?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          coach_agent_id?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_content_coach_agent_id_fkey"
            columns: ["coach_agent_id"]
            isOneToOne: false
            referencedRelation: "coach_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_messages: {
        Row: {
          confidence: number | null
          content: string | null
          created_at: string
          direction: string
          id: string
          intent: string | null
          media_url: string | null
          message_type: string | null
          sentiment: string | null
          session_id: string
          status: string | null
          uazapi_message_id: string | null
        }
        Insert: {
          confidence?: number | null
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          intent?: string | null
          media_url?: string | null
          message_type?: string | null
          sentiment?: string | null
          session_id: string
          status?: string | null
          uazapi_message_id?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          intent?: string | null
          media_url?: string | null
          message_type?: string | null
          sentiment?: string | null
          session_id?: string
          status?: string | null
          uazapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_progress: {
        Row: {
          created_at: string
          id: string
          metric_data: Json | null
          metric_type: string
          metric_value: number | null
          notes: string | null
          phone_number: string
          recorded_at: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_data?: Json | null
          metric_type: string
          metric_value?: number | null
          notes?: string | null
          phone_number: string
          recorded_at?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_data?: Json | null
          metric_type?: string
          metric_value?: number | null
          notes?: string | null
          phone_number?: string
          recorded_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_agent_id: string | null
          completed_at: string | null
          condominium_id: string | null
          created_at: string
          current_step: number | null
          goals: Json | null
          id: string
          last_interaction_at: string
          phone_number: string
          session_data: Json | null
          session_status: string | null
          session_type: string | null
          started_at: string
          total_steps: number | null
          unit_id: string | null
        }
        Insert: {
          coach_agent_id?: string | null
          completed_at?: string | null
          condominium_id?: string | null
          created_at?: string
          current_step?: number | null
          goals?: Json | null
          id?: string
          last_interaction_at?: string
          phone_number: string
          session_data?: Json | null
          session_status?: string | null
          session_type?: string | null
          started_at?: string
          total_steps?: number | null
          unit_id?: string | null
        }
        Update: {
          coach_agent_id?: string | null
          completed_at?: string | null
          condominium_id?: string | null
          created_at?: string
          current_step?: number | null
          goals?: Json | null
          id?: string
          last_interaction_at?: string
          phone_number?: string
          session_data?: Json | null
          session_status?: string | null
          session_type?: string | null
          started_at?: string
          total_steps?: number | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_coach_agent_id_fkey"
            columns: ["coach_agent_id"]
            isOneToOne: false
            referencedRelation: "coach_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      condominiums: {
        Row: {
          address: string | null
          administrator_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          total_units: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          administrator_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          total_units?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          administrator_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          total_units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominiums_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_final: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_final?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_final?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      defaulter_statistics: {
        Row: {
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          recovered_amount: number | null
          recovery_rate: number | null
          total_amount: number | null
          total_defaulters: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          recovered_amount?: number | null
          recovery_rate?: number | null
          total_amount?: number | null
          total_defaulters?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          recovered_amount?: number | null
          recovery_rate?: number | null
          total_amount?: number | null
          total_defaulters?: number | null
        }
        Relationships: []
      }
      employee_coach_instances: {
        Row: {
          coach_agent_id: string | null
          created_at: string
          id: string
          instance_id: string | null
          last_activity_at: string | null
          status: string | null
          total_conversations: number | null
          total_images_analyzed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_agent_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          last_activity_at?: string | null
          status?: string | null
          total_conversations?: number | null
          total_images_analyzed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_agent_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          last_activity_at?: string | null
          status?: string | null
          total_conversations?: number | null
          total_images_analyzed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_coach_instances_coach_agent_id_fkey"
            columns: ["coach_agent_id"]
            isOneToOne: false
            referencedRelation: "coach_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_coach_instances_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "uazapi_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      login_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      login_statistics: {
        Row: {
          created_at: string
          failed_logins: number | null
          id: string
          period: string | null
          successful_logins: number | null
          total_logins: number | null
        }
        Insert: {
          created_at?: string
          failed_logins?: number | null
          id?: string
          period?: string | null
          successful_logins?: number | null
          total_logins?: number | null
        }
        Update: {
          created_at?: string
          failed_logins?: number | null
          id?: string
          period?: string | null
          successful_logins?: number | null
          total_logins?: number | null
        }
        Relationships: []
      }
      management_systems: {
        Row: {
          active: boolean | null
          created_at: string
          csv_format: Json | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          csv_format?: Json | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          csv_format?: Json | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_statistics: {
        Row: {
          created_at: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"] | null
          period: string | null
          total_delivered: number | null
          total_opened: number | null
          total_responded: number | null
          total_sent: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          period?: string | null
          total_delivered?: number | null
          total_opened?: number | null
          total_responded?: number | null
          total_sent?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          period?: string | null
          total_delivered?: number | null
          total_opened?: number | null
          total_responded?: number | null
          total_sent?: number | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          subject: string | null
          template_type: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          charge_id: string | null
          clicked_at: string | null
          content: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient: string
          responded_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          subject: string | null
          template_id: string | null
          type: Database["public"]["Enums"]["message_type"]
          unit_id: string | null
        }
        Insert: {
          charge_id?: string | null
          clicked_at?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient: string
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          subject?: string | null
          template_id?: string | null
          type: Database["public"]["Enums"]["message_type"]
          unit_id?: string | null
        }
        Update: {
          charge_id?: string | null
          clicked_at?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient?: string
          responded_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          subject?: string | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_history: {
        Row: {
          ai_analysis: Json | null
          ai_recommendation: string | null
          ai_score: number | null
          charge_id: string
          created_at: string | null
          discount_percentage: number | null
          id: string
          installments: number | null
          notes: string | null
          original_amount: number
          proposed_amount: number
          proposed_at: string | null
          proposed_by: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_recommendation?: string | null
          ai_score?: number | null
          charge_id: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          installments?: number | null
          notes?: string | null
          original_amount: number
          proposed_amount: number
          proposed_at?: string | null
          proposed_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_recommendation?: string | null
          ai_score?: number | null
          charge_id?: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          installments?: number | null
          notes?: string | null
          original_amount?: number
          proposed_amount?: number
          proposed_at?: string | null
          proposed_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_history_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_parameters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          parameter_key: string
          parameter_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          parameter_key: string
          parameter_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          parameter_key?: string
          parameter_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          ai_analysis: Json | null
          ai_confidence: number | null
          analyzed_at: string | null
          analyzed_by: string | null
          charge_id: string
          conversation_id: string | null
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string | null
          notes: string | null
          rejection_reason: string | null
          status: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_confidence?: number | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          charge_id: string
          conversation_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          status?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_confidence?: number | null
          analyzed_at?: string | null
          analyzed_by?: string | null
          charge_id?: string
          conversation_id?: string | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          property_type: string | null
          rg: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          property_type?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          property_type?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      uazapi_instances: {
        Row: {
          admin_field_01: string | null
          admin_field_02: string | null
          agent_personality: string | null
          api_key: string
          auto_reply_delay_ms: number | null
          base_url: string
          created_at: string
          created_by: string | null
          id: string
          instance_id: string
          instance_type: string | null
          is_autonomous: boolean | null
          is_default: boolean | null
          name: string
          owner_id: string | null
          phone_number: string | null
          qr_code: string | null
          status: string | null
          updated_at: string
          webhook_events: Json | null
        }
        Insert: {
          admin_field_01?: string | null
          admin_field_02?: string | null
          agent_personality?: string | null
          api_key: string
          auto_reply_delay_ms?: number | null
          base_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id: string
          instance_type?: string | null
          is_autonomous?: boolean | null
          is_default?: boolean | null
          name: string
          owner_id?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string
          webhook_events?: Json | null
        }
        Update: {
          admin_field_01?: string | null
          admin_field_02?: string | null
          agent_personality?: string | null
          api_key?: string
          auto_reply_delay_ms?: number | null
          base_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instance_id?: string
          instance_type?: string | null
          is_autonomous?: boolean | null
          is_default?: boolean | null
          name?: string
          owner_id?: string | null
          phone_number?: string | null
          qr_code?: string | null
          status?: string | null
          updated_at?: string
          webhook_events?: Json | null
        }
        Relationships: []
      }
      units: {
        Row: {
          block: string | null
          condominium_id: string
          created_at: string
          fraction: number | null
          id: string
          is_rented: boolean | null
          owner_city: string | null
          owner_complement: string | null
          owner_cpf: string | null
          owner_email: string | null
          owner_name: string | null
          owner_neighborhood: string | null
          owner_number: string | null
          owner_phone: string | null
          owner_state: string | null
          owner_street: string | null
          owner_zip_code: string | null
          tenant_cpf: string | null
          tenant_email: string | null
          tenant_name: string | null
          tenant_phone: string | null
          tower: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          block?: string | null
          condominium_id: string
          created_at?: string
          fraction?: number | null
          id?: string
          is_rented?: boolean | null
          owner_city?: string | null
          owner_complement?: string | null
          owner_cpf?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_neighborhood?: string | null
          owner_number?: string | null
          owner_phone?: string | null
          owner_state?: string | null
          owner_street?: string | null
          owner_zip_code?: string | null
          tenant_cpf?: string | null
          tenant_email?: string | null
          tenant_name?: string | null
          tenant_phone?: string | null
          tower?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          block?: string | null
          condominium_id?: string
          created_at?: string
          fraction?: number | null
          id?: string
          is_rented?: boolean | null
          owner_city?: string | null
          owner_complement?: string | null
          owner_cpf?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_neighborhood?: string | null
          owner_number?: string | null
          owner_phone?: string | null
          owner_state?: string | null
          owner_street?: string | null
          owner_zip_code?: string | null
          tenant_cpf?: string | null
          tenant_email?: string | null
          tenant_name?: string | null
          tenant_phone?: string | null
          tower?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      units_limited: {
        Row: {
          created_at: string
          id: string
          limited_at: string | null
          reason: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          limited_at?: string | null
          reason?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          limited_at?: string | null
          reason?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_limited_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          bounced_at: string | null
          clicked_at: string | null
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          email: string
          email_id: string | null
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string | null
          opened_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          sent_at: string | null
          tracking_events: Json | null
        }
        Insert: {
          accepted_at?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          email_id?: string | null
          expires_at: string
          id?: string
          invitation_token: string
          invited_by?: string | null
          opened_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sent_at?: string | null
          tracking_events?: Json | null
        }
        Update: {
          accepted_at?: string | null
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          email_id?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          opened_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sent_at?: string | null
          tracking_events?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          awaiting_response_type: string | null
          charge_id: string | null
          condominium_id: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_from: string | null
          last_message_preview: string | null
          metadata: Json | null
          phone_number: string
          status: string | null
          tags: string[] | null
          unit_id: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          awaiting_response_type?: string | null
          charge_id?: string | null
          condominium_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_from?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          phone_number: string
          status?: string | null
          tags?: string[] | null
          unit_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          awaiting_response_type?: string | null
          charge_id?: string | null
          condominium_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_from?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          phone_number?: string
          status?: string | null
          tags?: string[] | null
          unit_id?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          caption: string | null
          content: string | null
          conversation_id: string
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_message: string | null
          id: string
          media_mimetype: string | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          recipient_phone: string | null
          sender_phone: string | null
          status: string | null
          uazapi_message_id: string | null
        }
        Insert: {
          caption?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          media_mimetype?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_phone?: string | null
          sender_phone?: string | null
          status?: string | null
          uazapi_message_id?: string | null
        }
        Update: {
          caption?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          media_mimetype?: string | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_phone?: string | null
          sender_phone?: string | null
          status?: string | null
          uazapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          active: boolean | null
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      whatsapp_webhooks_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          instance_id: string | null
          payload: Json
          phone_number: string | null
          processed: boolean | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          instance_id?: string | null
          payload: Json
          phone_number?: string | null
          processed?: boolean | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          instance_id?: string | null
          payload?: Json
          phone_number?: string | null
          processed?: boolean | null
          processed_at?: string | null
        }
        Relationships: []
      }
      workflow_edges: {
        Row: {
          created_at: string
          edge_id: string
          id: string
          source: string
          source_handle: string | null
          target: string
          target_handle: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          edge_id: string
          id?: string
          source: string
          source_handle?: string | null
          target: string
          target_handle?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          edge_id?: string
          id?: string
          source?: string
          source_handle?: string | null
          target?: string
          target_handle?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          charge_id: string | null
          completed_at: string | null
          created_at: string
          current_node: string | null
          error_message: string | null
          execution_data: Json | null
          id: string
          started_at: string | null
          status: string | null
          workflow_id: string
        }
        Insert: {
          charge_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_node?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          workflow_id: string
        }
        Update: {
          charge_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_node?: string | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_loop_configs: {
        Row: {
          created_at: string
          delay_hours: number | null
          exit_condition: string | null
          id: string
          loop_id: string
          max_iterations: number | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          delay_hours?: number | null
          exit_condition?: string | null
          id?: string
          loop_id: string
          max_iterations?: number | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          delay_hours?: number | null
          exit_condition?: string | null
          id?: string
          loop_id?: string
          max_iterations?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_loop_configs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_loops: {
        Row: {
          condition_type: string | null
          created_at: string
          id: string
          max_iterations: number | null
          node_id: string
          workflow_id: string
        }
        Insert: {
          condition_type?: string | null
          created_at?: string
          id?: string
          max_iterations?: number | null
          node_id: string
          workflow_id: string
        }
        Update: {
          condition_type?: string | null
          created_at?: string
          id?: string
          max_iterations?: number | null
          node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_loops_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          node_id: string
          position_x: number | null
          position_y: number | null
          type: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          node_id: string
          position_x?: number | null
          position_y?: number | null
          type: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          node_id?: string
          position_x?: number | null
          position_y?: number | null
          type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["user_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      charge_status: "pending" | "paid" | "overdue" | "cancelled"
      message_status: "pending" | "sent" | "delivered" | "failed"
      message_type: "email" | "whatsapp" | "sms"
      user_role: "admin" | "assistant" | "employee" | "supervisor"
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
      charge_status: ["pending", "paid", "overdue", "cancelled"],
      message_status: ["pending", "sent", "delivered", "failed"],
      message_type: ["email", "whatsapp", "sms"],
      user_role: ["admin", "assistant", "employee", "supervisor"],
    },
  },
} as const
