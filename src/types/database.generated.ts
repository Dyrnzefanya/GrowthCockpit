export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          description: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      experiment_results: {
        Row: {
          conclusion: string
          created_at: string
          decided_at: string
          decided_by: string
          evidence: Json
          experiment_id: string
          id: string
          learning: string
          next_action: string
          outcome: string
          primary_kpi_result: number
          search_vector: unknown
          updated_at: string
        }
        Insert: {
          conclusion: string
          created_at?: string
          decided_at?: string
          decided_by: string
          evidence?: Json
          experiment_id: string
          id?: string
          learning: string
          next_action: string
          outcome: string
          primary_kpi_result: number
          search_vector?: unknown
          updated_at?: string
        }
        Update: {
          conclusion?: string
          created_at?: string
          decided_at?: string
          decided_by?: string
          evidence?: Json
          experiment_id?: string
          id?: string
          learning?: string
          next_action?: string
          outcome?: string
          primary_kpi_result?: number
          search_vector?: unknown
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_results_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: true
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          baseline_value: number | null
          code: string
          confidence: number
          control_description: string
          created_at: string
          effort: number
          end_date: string | null
          external_refs: Json
          hypothesis: string
          id: string
          owner_id: string
          platform: string | null
          primary_kpi: string
          priority: number
          review_date: string
          secondary_kpi: string | null
          start_date: string
          status: string
          target_value: number | null
          title: string
          updated_at: string
          variable: string
          variant_description: string
        }
        Insert: {
          baseline_value?: number | null
          code: string
          confidence?: number
          control_description?: string
          created_at?: string
          effort?: number
          end_date?: string | null
          external_refs?: Json
          hypothesis: string
          id?: string
          owner_id: string
          platform?: string | null
          primary_kpi: string
          priority?: number
          review_date: string
          secondary_kpi?: string | null
          start_date: string
          status?: string
          target_value?: number | null
          title: string
          updated_at?: string
          variable: string
          variant_description?: string
        }
        Update: {
          baseline_value?: number | null
          code?: string
          confidence?: number
          control_description?: string
          created_at?: string
          effort?: number
          end_date?: string | null
          external_refs?: Json
          hypothesis?: string
          id?: string
          owner_id?: string
          platform?: string | null
          primary_kpi?: string
          priority?: number
          review_date?: string
          secondary_kpi?: string | null
          start_date?: string
          status?: string
          target_value?: number | null
          title?: string
          updated_at?: string
          variable?: string
          variant_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          context_id: string | null
          context_type: string
          created_at: string
          created_by: string
          id: string
          note_date: string
          updated_at: string
        }
        Insert: {
          body: string
          context_id?: string | null
          context_type?: string
          created_at?: string
          created_by?: string
          id?: string
          note_date: string
          updated_at?: string
        }
        Update: {
          body?: string
          context_id?: string | null
          context_type?: string
          created_at?: string
          created_by?: string
          id?: string
          note_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_articles: {
        Row: {
          article_type: string
          body_md: string
          category: string
          created_at: string
          id: string
          published_at: string | null
          search_vector: unknown
          slug: string
          status: string
          summary: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          article_type: string
          body_md: string
          category: string
          created_at?: string
          id?: string
          published_at?: string | null
          search_vector?: unknown
          slug: string
          status?: string
          summary: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          article_type?: string
          body_md?: string
          category?: string
          created_at?: string
          id?: string
          published_at?: string | null
          search_vector?: unknown
          slug?: string
          status?: string
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_items: {
        Row: {
          completed_at: string | null
          created_at: string
          help_snapshot: string
          id: string
          is_done: boolean
          label_snapshot: string
          notes: string
          position: number
          required_snapshot: boolean
          run_id: string
          step_key: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          help_snapshot?: string
          id?: string
          is_done?: boolean
          label_snapshot: string
          notes?: string
          position: number
          required_snapshot: boolean
          run_id: string
          step_key: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          help_snapshot?: string
          id?: string
          is_done?: boolean
          label_snapshot?: string
          notes?: string
          position?: number
          required_snapshot?: boolean
          run_id?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          run_date: string
          started_at: string | null
          status: string
          template_id: string
          template_name_snapshot: string
          template_version: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          run_date: string
          started_at?: string | null
          status?: string
          template_id: string
          template_name_snapshot: string
          template_version: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          run_date?: string
          started_at?: string | null
          status?: string
          template_id?: string
          template_name_snapshot?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          cadence: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          steps: Json
          updated_at: string
          version: number
          weekdays: number[] | null
        }
        Insert: {
          cadence: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          steps: Json
          updated_at?: string
          version?: number
          weekdays?: number[] | null
        }
        Update: {
          cadence?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          steps?: Json
          updated_at?: string
          version?: number
          weekdays?: number[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_workflow_item: {
        Args: {
          p_completed: string
          p_done: boolean
          p_expected: string
          p_item_completed: string
          p_item_id: string
          p_note: string
          p_run_id: string
          p_started: string
          p_status: string
        }
        Returns: undefined
      }
      create_experiment: {
        Args: {
          p_baseline_value?: number
          p_confidence?: number
          p_control_description?: string
          p_effort?: number
          p_external_refs?: Json
          p_hypothesis: string
          p_platform?: string
          p_primary_kpi: string
          p_priority?: number
          p_review_date: string
          p_secondary_kpi?: string
          p_start_date: string
          p_target_value?: number
          p_title: string
          p_variable: string
          p_variant_description?: string
        }
        Returns: string
      }
      immutable_text_array: { Args: { value: string[] }; Returns: string }
      materialize_workflow: {
        Args: {
          p_date: string
          p_items: Json
          p_template_id: string
          p_version: number
        }
        Returns: string
      }
      search_playbook: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: string
          p_tag?: string
          p_type?: string
        }
        Returns: {
          article_type: string
          category: string
          id: string
          published_at: string
          rank: number
          slug: string
          status: string
          summary: string
          tags: string[]
          title: string
          total_count: number
          updated_at: string
          version: number
        }[]
      }
      transition_experiment: {
        Args: {
          p_conclusion?: string
          p_end_date: string
          p_evidence?: Json
          p_expected: string
          p_id: string
          p_learning?: string
          p_next_action?: string
          p_outcome?: string
          p_primary_kpi_result?: number
          p_to: string
        }
        Returns: undefined
      }
      update_draft_experiment: {
        Args: {
          p_baseline_value?: number
          p_confidence?: number
          p_control_description?: string
          p_effort?: number
          p_expected: string
          p_external_refs?: Json
          p_hypothesis: string
          p_id: string
          p_platform?: string
          p_primary_kpi: string
          p_priority?: number
          p_review_date: string
          p_secondary_kpi?: string
          p_start_date: string
          p_target_value?: number
          p_title: string
          p_variable: string
          p_variant_description?: string
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
