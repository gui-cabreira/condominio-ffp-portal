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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      administrator_contacts: {
        Row: {
          active: boolean | null
          administrator_id: string
          cpf: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          administrator_id: string
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          administrator_id?: string
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "administrator_contacts_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administrator_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      administrators: {
        Row: {
          active: boolean
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
          legal_name: string | null
          legal_nature: string | null
          main_activity: string | null
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
          active?: boolean
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
          legal_name?: string | null
          legal_nature?: string | null
          main_activity?: string | null
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
          active?: boolean
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
          legal_name?: string | null
          legal_nature?: string | null
          main_activity?: string | null
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
            foreignKeyName: "administrators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      boleto_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          charge_id: string
          created_at: string | null
          id: string
          new_charge_id: string | null
          reason: string | null
          requested_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          charge_id: string
          created_at?: string | null
          id?: string
          new_charge_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          charge_id?: string
          created_at?: string | null
          id?: string
          new_charge_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boleto_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "boleto_requests_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_requests_new_charge_id_fkey"
            columns: ["new_charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      charge_imports: {
        Row: {
          administrator_id: string
          created_at: string
          created_by: string | null
          error_log: string | null
          failed_imports: number | null
          file_name: string | null
          id: string
          original_content: string
          processed_content: Json | null
          status: string
          successful_imports: number | null
          total_charges: number | null
        }
        Insert: {
          administrator_id: string
          created_at?: string
          created_by?: string | null
          error_log?: string | null
          failed_imports?: number | null
          file_name?: string | null
          id?: string
          original_content: string
          processed_content?: Json | null
          status?: string
          successful_imports?: number | null
          total_charges?: number | null
        }
        Update: {
          administrator_id?: string
          created_at?: string
          created_by?: string | null
          error_log?: string | null
          failed_imports?: number | null
          file_name?: string | null
          id?: string
          original_content?: string
          processed_content?: Json | null
          status?: string
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
            foreignKeyName: "charge_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      charge_timeline: {
        Row: {
          charge_id: string
          created_at: string | null
          created_by: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          charge_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          charge_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "charge_timeline_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_timeline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      charges: {
        Row: {
          administrator_id: string | null
          amount: number
          created_at: string
          description: string | null
          due_date: string
          id: string
          import_id: string | null
          payment_date: string | null
          reference_month: string | null
          status: string
          unit_id: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          administrator_id?: string | null
          amount: number
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          import_id?: string | null
          payment_date?: string | null
          reference_month?: string | null
          status?: string
          unit_id: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          administrator_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          import_id?: string | null
          payment_date?: string | null
          reference_month?: string | null
          status?: string
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
            foreignKeyName: "charges_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "charge_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
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
          total_units: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          administrator_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          total_units?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          administrator_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          total_units?: number
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
          {
            foreignKeyName: "condominiums_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      login_logs: {
        Row: {
          id: string
          ip_address: string | null
          login_at: string
          metadata: Json | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          login_at?: string
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          login_at?: string
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          charge_id: string | null
          content: string
          created_at: string
          id: string
          opened_at: string | null
          responded_at: string | null
          sent_at: string
          status: string
          type: string
          unit_id: string
        }
        Insert: {
          charge_id?: string | null
          content: string
          created_at?: string
          id?: string
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string
          status?: string
          type: string
          unit_id: string
        }
        Update: {
          charge_id?: string | null
          content?: string
          created_at?: string
          id?: string
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string
          status?: string
          type?: string
          unit_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          neighborhood: string | null
          phone: string | null
          rg: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_bugs: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          reported_by: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          reported_by?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_bugs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_bugs_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          description: string
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          event_category: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      units: {
        Row: {
          condominium_id: string
          created_at: string
          id: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          id?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          id?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
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
          {
            foreignKeyName: "units_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "defaulter_statistics"
            referencedColumns: ["condominium_id"]
          },
          {
            foreignKeyName: "units_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "message_statistics"
            referencedColumns: ["condominium_id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
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
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workflow_config: {
        Row: {
          created_at: string | null
          description: string | null
          encrypted: boolean | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          encrypted?: boolean | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          encrypted?: boolean | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      workflow_edges: {
        Row: {
          created_at: string
          edge_type: string | null
          id: string
          source_node_id: string
          target_node_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          edge_type?: string | null
          id?: string
          source_node_id: string
          target_node_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          edge_type?: string | null
          id?: string
          source_node_id?: string
          target_node_id?: string
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
      workflow_execution_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          node_id: string
          node_type: string
          result: Json | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          node_id: string
          node_type: string
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          node_id?: string
          node_type?: string
          result?: Json | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          charge_id: string | null
          completed_at: string | null
          created_at: string
          current_node_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          charge_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          charge_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
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
      workflow_loops: {
        Row: {
          condition_type: string | null
          created_at: string
          current_iteration: number | null
          id: string
          max_iterations: number
          node_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          condition_type?: string | null
          created_at?: string
          current_iteration?: number | null
          id?: string
          max_iterations?: number
          node_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          condition_type?: string | null
          created_at?: string
          current_iteration?: number | null
          id?: string
          max_iterations?: number
          node_id?: string
          updated_at?: string
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
          config: Json | null
          created_at: string
          id: string
          node_id: string
          node_type: string
          position_x: number
          position_y: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          node_id: string
          node_type: string
          position_x?: number
          position_y?: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          node_id?: string
          node_type?: string
          position_x?: number
          position_y?: number
          updated_at?: string
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
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "login_statistics"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      defaulter_statistics: {
        Row: {
          condominium_id: string | null
          condominium_name: string | null
          defaulter_units: number | null
          paid_units: number | null
          total_paid_amount: number | null
          total_pending_amount: number | null
          total_units: number | null
        }
        Relationships: []
      }
      login_statistics: {
        Row: {
          email: string | null
          failed_attempts: number | null
          last_login: string | null
          total_logins: number | null
          user_id: string | null
        }
        Relationships: []
      }
      message_statistics: {
        Row: {
          condominium_id: string | null
          condominium_name: string | null
          messages_not_opened: number | null
          messages_opened: number | null
          messages_responded: number | null
          total_messages_sent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_token: string; user_id: string }
        Returns: boolean
      }
      create_admin_user: {
        Args: { user_email: string }
        Returns: undefined
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
      user_role:
        | "admin"
        | "collaborator"
        | "supervisor"
        | "employee"
        | "assistant"
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
      user_role: [
        "admin",
        "collaborator",
        "supervisor",
        "employee",
        "assistant",
      ],
    },
  },
} as const
