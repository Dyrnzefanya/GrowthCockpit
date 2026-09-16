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
      ad_accounts: {
        Row: {
          created_at: string
          currency: string
          external_account_id: string
          id: string
          is_active: boolean
          name: string
          platform: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          external_account_id: string
          id?: string
          is_active?: boolean
          name: string
          platform: string
          timezone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          external_account_id?: string
          id?: string
          is_active?: boolean
          name?: string
          platform?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_metrics_daily: {
        Row: {
          ad_account_id: string
          ad_id: string
          ad_name: string | null
          adset_id: string
          adset_name: string | null
          campaign_id: string
          campaign_name: string
          clicks: number
          currency: string
          frequency: number | null
          id: string
          impressions: number
          ingested_at: string
          metric_date: string
          platform: string
          platform_cost_per_result: number | null
          platform_result_type: string | null
          platform_results: number | null
          reach: number | null
          source_timezone: string
          spend: number
        }
        Insert: {
          ad_account_id: string
          ad_id?: string
          ad_name?: string | null
          adset_id?: string
          adset_name?: string | null
          campaign_id: string
          campaign_name: string
          clicks: number
          currency: string
          frequency?: number | null
          id?: string
          impressions: number
          ingested_at?: string
          metric_date: string
          platform: string
          platform_cost_per_result?: number | null
          platform_result_type?: string | null
          platform_results?: number | null
          reach?: number | null
          source_timezone: string
          spend: number
        }
        Update: {
          ad_account_id?: string
          ad_id?: string
          ad_name?: string | null
          adset_id?: string
          adset_name?: string | null
          campaign_id?: string
          campaign_name?: string
          clicks?: number
          currency?: string
          frequency?: number | null
          id?: string
          impressions?: number
          ingested_at?: string
          metric_date?: string
          platform?: string
          platform_cost_per_result?: number | null
          platform_result_type?: string | null
          platform_results?: number | null
          reach?: number | null
          source_timezone?: string
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_metrics_daily_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_dismissals: Json
          alert_key: string
          created_at: string
          dismissal_count: number
          dismissed_reason: string | null
          dismissed_until: string | null
          entity_id: string | null
          entity_type: string
          evidence: Json
          first_seen_at: string
          history: Json
          id: string
          last_notified_at: string | null
          last_seen_at: string
          message: string
          next_notification_at: string | null
          notification_attempts: number
          notification_count: number
          notification_status: string
          occurrence_count: number
          resolved_at: string | null
          resolved_reason: string | null
          severity: string
          snooze_until: string | null
          source: string
          status: string
          suppressed_at: string | null
          suppressed_by: string | null
          suppressed_reason: string | null
          suppressed_until: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_dismissals?: Json
          alert_key: string
          created_at?: string
          dismissal_count?: number
          dismissed_reason?: string | null
          dismissed_until?: string | null
          entity_id?: string | null
          entity_type: string
          evidence?: Json
          first_seen_at: string
          history?: Json
          id?: string
          last_notified_at?: string | null
          last_seen_at: string
          message: string
          next_notification_at?: string | null
          notification_attempts?: number
          notification_count?: number
          notification_status?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_reason?: string | null
          severity: string
          snooze_until?: string | null
          source: string
          status?: string
          suppressed_at?: string | null
          suppressed_by?: string | null
          suppressed_reason?: string | null
          suppressed_until?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_dismissals?: Json
          alert_key?: string
          created_at?: string
          dismissal_count?: number
          dismissed_reason?: string | null
          dismissed_until?: string | null
          entity_id?: string | null
          entity_type?: string
          evidence?: Json
          first_seen_at?: string
          history?: Json
          id?: string
          last_notified_at?: string | null
          last_seen_at?: string
          message?: string
          next_notification_at?: string | null
          notification_attempts?: number
          notification_count?: number
          notification_status?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_reason?: string | null
          severity?: string
          snooze_until?: string | null
          source?: string
          status?: string
          suppressed_at?: string | null
          suppressed_by?: string | null
          suppressed_reason?: string | null
          suppressed_until?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_suppressed_by_fkey"
            columns: ["suppressed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          audit_history: Json
          created_at: string
          description: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          audit_history?: Json
          created_at?: string
          description: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          audit_history?: Json
          created_at?: string
          description?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          domain: string | null
          external_id: string | null
          hubspot_company_id: string | null
          id: string
          industry: string | null
          name: string
          name_key: string
          segment: string | null
          source_system: string
          source_updated_at: string | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          external_id?: string | null
          hubspot_company_id?: string | null
          id?: string
          industry?: string | null
          name: string
          name_key: string
          segment?: string | null
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          external_id?: string | null
          hubspot_company_id?: string | null
          id?: string
          industry?: string | null
          name?: string
          name_key?: string
          segment?: string | null
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          external_id: string | null
          ft_at: string | null
          ft_campaign: string | null
          ft_content: string | null
          ft_landing_page: string | null
          ft_medium: string | null
          ft_referrer: string | null
          ft_source: string | null
          ft_term: string | null
          full_name: string | null
          hubspot_contact_id: string | null
          hubspot_owner_id: string | null
          id: string
          lifecycle_stage: string | null
          lifecycle_stage_at: string | null
          phone_e164: string | null
          source_system: string
          source_updated_at: string | null
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          ft_at?: string | null
          ft_campaign?: string | null
          ft_content?: string | null
          ft_landing_page?: string | null
          ft_medium?: string | null
          ft_referrer?: string | null
          ft_source?: string | null
          ft_term?: string | null
          full_name?: string | null
          hubspot_contact_id?: string | null
          hubspot_owner_id?: string | null
          id?: string
          lifecycle_stage?: string | null
          lifecycle_stage_at?: string | null
          phone_e164?: string | null
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          ft_at?: string | null
          ft_campaign?: string | null
          ft_content?: string | null
          ft_landing_page?: string | null
          ft_medium?: string | null
          ft_referrer?: string | null
          ft_source?: string | null
          ft_term?: string | null
          full_name?: string | null
          hubspot_contact_id?: string | null
          hubspot_owner_id?: string | null
          id?: string
          lifecycle_stage?: string | null
          lifecycle_stage_at?: string | null
          phone_e164?: string | null
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          attributed_campaign: string | null
          attribution_allocations: Json
          attribution_rule_version: string | null
          close_date: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          expected_close_date: string | null
          external_id: string | null
          hubspot_deal_id: string | null
          id: string
          lead_id: string | null
          name: string
          owner_hubspot_id: string | null
          pipeline: string
          source_system: string
          source_updated_at: string | null
          stage_category: string
          stage_key: string
          stage_label: string
          synced_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          attributed_campaign?: string | null
          attribution_allocations?: Json
          attribution_rule_version?: string | null
          close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          external_id?: string | null
          hubspot_deal_id?: string | null
          id?: string
          lead_id?: string | null
          name: string
          owner_hubspot_id?: string | null
          pipeline: string
          source_system?: string
          source_updated_at?: string | null
          stage_category: string
          stage_key: string
          stage_label: string
          synced_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          attributed_campaign?: string | null
          attribution_allocations?: Json
          attribution_rule_version?: string | null
          close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          expected_close_date?: string | null
          external_id?: string | null
          hubspot_deal_id?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          owner_hubspot_id?: string | null
          pipeline?: string
          source_system?: string
          source_updated_at?: string | null
          stage_category?: string
          stage_key?: string
          stage_label?: string
          synced_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      integration_runs: {
        Row: {
          correlation_id: string
          created_at: string
          ended_at: string | null
          error_summary: string | null
          event_id: string | null
          id: string
          integration: string
          job_key: string | null
          lease_until: string | null
          records_failed: number
          records_read: number
          records_written: number
          resource: string
          started_at: string
          status: string
          trigger: string
          updated_at: string
        }
        Insert: {
          correlation_id: string
          created_at?: string
          ended_at?: string | null
          error_summary?: string | null
          event_id?: string | null
          id?: string
          integration: string
          job_key?: string | null
          lease_until?: string | null
          records_failed?: number
          records_read?: number
          records_written?: number
          resource: string
          started_at?: string
          status: string
          trigger: string
          updated_at?: string
        }
        Update: {
          correlation_id?: string
          created_at?: string
          ended_at?: string | null
          error_summary?: string | null
          event_id?: string | null
          id?: string
          integration?: string
          job_key?: string | null
          lease_until?: string | null
          records_failed?: number
          records_read?: number
          records_written?: number
          resource?: string
          started_at?: string
          status?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_events: {
        Row: {
          actor: string | null
          changed_at: string
          created_at: string
          from_status: string | null
          id: string
          lead_id: string
          note: string
          source: string
          to_status: string
          updated_at: string
        }
        Insert: {
          actor?: string | null
          changed_at: string
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id: string
          note: string
          source: string
          to_status: string
          updated_at?: string
        }
        Update: {
          actor?: string | null
          changed_at?: string
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          note?: string
          source?: string
          to_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_events_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          attribution_missing: boolean
          campaign_id: string | null
          channel: string
          click_id: string | null
          click_id_type: string
          company_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          dedupe_key: string
          disqualified_at: string | null
          duplicate_suspect: boolean
          estimated_quantity: number | null
          external_id: string | null
          id: string
          inquiry_at: string
          inquiry_date: string
          inquiry_observations: string[]
          landing_page: string | null
          lt_campaign: string | null
          lt_content: string | null
          lt_medium: string | null
          lt_source: string | null
          lt_term: string | null
          manual_override: boolean
          message: string | null
          out_of_scope: boolean
          owner_id: string | null
          platform: string
          product_interest: string | null
          product_key: string
          qualification_reason: string
          qualification_rule_version: string
          qualification_settings: Json
          qualification_status: string
          qualified_at: string | null
          referrer: string | null
          required_by_date: string | null
          source_event_id: string | null
          source_system: string
          source_updated_at: string | null
          sql_at: string | null
          submission_keys: string[]
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          attribution_missing: boolean
          campaign_id?: string | null
          channel: string
          click_id?: string | null
          click_id_type?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          dedupe_key: string
          disqualified_at?: string | null
          duplicate_suspect?: boolean
          estimated_quantity?: number | null
          external_id?: string | null
          id?: string
          inquiry_at: string
          inquiry_date: string
          inquiry_observations: string[]
          landing_page?: string | null
          lt_campaign?: string | null
          lt_content?: string | null
          lt_medium?: string | null
          lt_source?: string | null
          lt_term?: string | null
          manual_override?: boolean
          message?: string | null
          out_of_scope?: boolean
          owner_id?: string | null
          platform: string
          product_interest?: string | null
          product_key?: string
          qualification_reason: string
          qualification_rule_version: string
          qualification_settings: Json
          qualification_status: string
          qualified_at?: string | null
          referrer?: string | null
          required_by_date?: string | null
          source_event_id?: string | null
          source_system?: string
          source_updated_at?: string | null
          sql_at?: string | null
          submission_keys: string[]
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          attribution_missing?: boolean
          campaign_id?: string | null
          channel?: string
          click_id?: string | null
          click_id_type?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          dedupe_key?: string
          disqualified_at?: string | null
          duplicate_suspect?: boolean
          estimated_quantity?: number | null
          external_id?: string | null
          id?: string
          inquiry_at?: string
          inquiry_date?: string
          inquiry_observations?: string[]
          landing_page?: string | null
          lt_campaign?: string | null
          lt_content?: string | null
          lt_medium?: string | null
          lt_source?: string | null
          lt_term?: string | null
          manual_override?: boolean
          message?: string | null
          out_of_scope?: boolean
          owner_id?: string | null
          platform?: string
          product_interest?: string | null
          product_key?: string
          qualification_reason?: string
          qualification_rule_version?: string
          qualification_settings?: Json
          qualification_status?: string
          qualified_at?: string | null
          referrer?: string | null
          required_by_date?: string | null
          source_event_id?: string | null
          source_system?: string
          source_updated_at?: string | null
          sql_at?: string | null
          submission_keys?: string[]
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_deal_fk"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
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
      reports: {
        Row: {
          created_at: string
          created_by: string
          facts: Json
          finalized_at: string | null
          finalized_by: string | null
          id: string
          narrative_md: string
          period_end: string
          period_start: string
          status: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          facts: Json
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          narrative_md?: string
          period_end: string
          period_start: string
          status?: string
          type: string
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          facts?: Json
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          narrative_md?: string
          period_end?: string
          period_start?: string
          status?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_evaluations: {
        Row: {
          alert_id: string | null
          created_at: string
          evaluated_at: string
          evidence: Json
          id: string
          rule_key: string
          rule_version: string
          scope_id: string
          scope_type: string
          verdict: string
          window_end: string
          window_start: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          evaluated_at: string
          evidence: Json
          id?: string
          rule_key: string
          rule_version: string
          scope_id: string
          scope_type: string
          verdict: string
          window_end: string
          window_start: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          evaluated_at?: string
          evidence?: Json
          id?: string
          rule_key?: string
          rule_version?: string
          scope_id?: string
          scope_type?: string
          verdict?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_evaluations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          consecutive_failures: number
          created_at: string
          cursor: string | null
          id: string
          integration: string
          last_error: string | null
          last_run_at: string | null
          last_success_at: string | null
          resource: string
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          cursor?: string | null
          id?: string
          integration: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          resource: string
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          cursor?: string | null
          id?: string
          integration?: string
          last_error?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          resource?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number
          claim_id: string | null
          correlation_id: string
          created_at: string
          event_type: string
          external_event_id: string | null
          id: string
          idempotency_key: string | null
          last_error: string | null
          locked_at: string | null
          next_retry_at: string | null
          payload: Json | null
          processed_at: string | null
          received_at: string
          request_hash: string | null
          result: Json
          signature_valid: boolean
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          claim_id?: string | null
          correlation_id: string
          created_at?: string
          event_type?: string
          external_event_id?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          next_retry_at?: string | null
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          request_hash?: string | null
          result?: Json
          signature_valid: boolean
          source: string
          status: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          claim_id?: string | null
          correlation_id?: string
          created_at?: string
          event_type?: string
          external_event_id?: string | null
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          next_retry_at?: string | null
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          request_hash?: string | null
          result?: Json
          signature_valid?: boolean
          source?: string
          status?: string
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
      vw_attribution_coverage: {
        Row: {
          attributed: number | null
          inquiry_date: string | null
          leads: number | null
        }
        Relationships: []
      }
      vw_funnel_activity_daily: {
        Row: {
          event_date: string | null
          source: string | null
          to_status: string | null
          transitions: number | null
        }
        Relationships: []
      }
      vw_funnel_daily: {
        Row: {
          attributed: number | null
          currency: string | null
          deals: number | null
          disqualified: number | null
          inquiry_date: string | null
          leads: number | null
          lost: number | null
          lt_campaign: string | null
          missing_revenue: number | null
          mql: number | null
          open_deals: number | null
          past_expected_close: number | null
          past_expected_closed: number | null
          platform: string | null
          revenue: string | null
          spend: number | null
          sql: number | null
          won: number | null
        }
        Relationships: []
      }
      vw_lead_quality_by_campaign: {
        Row: {
          attributed: number | null
          campaign_id: string | null
          currency: string | null
          deals: number | null
          disqualified: number | null
          inquiry_date: string | null
          leads: number | null
          lost: number | null
          lt_campaign: string | null
          missing_revenue: number | null
          mql: number | null
          open_deals: number | null
          past_expected_close: number | null
          past_expected_closed: number | null
          platform: string | null
          revenue: string | null
          row_kind: string | null
          source_timezone: string | null
          spend: number | null
          sql: number | null
          won: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_webhook: { Args: { p_event: Json }; Returns: Json }
      alert_notification_volume: {
        Args: { p_days?: number }
        Returns: {
          business_date: string
          notifications: number
          type: string
        }[]
      }
      cancel_meta_range: { Args: { p_run: string }; Returns: undefined }
      claim_webhook: {
        Args: { p_id: string; p_max: number; p_trigger: string }
        Returns: Json
      }
      commit_deal: {
        Args: { p_deal: Json; p_lead_revision: string; p_revision: string }
        Returns: undefined
      }
      commit_decisions: {
        Args: { p_cursor: string; p_rows: Json; p_run: string }
        Returns: number
      }
      commit_hubspot_mirror: {
        Args: {
          p_changes: Json
          p_claim?: string
          p_event?: string
          p_events: Json
          p_result?: Json
        }
        Returns: undefined
      }
      commit_lead_batch: {
        Args: { p_plan: Json; p_revision: string; p_scope: Json }
        Returns: undefined
      }
      commit_lead_override: {
        Args: { p_event: Json; p_id: string; p_patch: Json; p_revision: string }
        Returns: undefined
      }
      commit_meta_page: {
        Args: {
          p_account: Json
          p_complete: boolean
          p_cursor: string
          p_resource: string
          p_rows: Json
          p_run: string
        }
        Returns: number
      }
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
      create_weekly_report_draft: {
        Args: {
          p_actor: string
          p_end: string
          p_facts: Json
          p_narrative: string
          p_start: string
        }
        Returns: string
      }
      crm_snapshot: { Args: { p_scope: Json }; Returns: Json }
      decision_action: {
        Args: {
          p_actor: string
          p_id: string
          p_operation: string
          p_reason: string
          p_revision: string
          p_until: string
        }
        Returns: undefined
      }
      decision_facts: { Args: { p_from: string; p_to: string }; Returns: Json }
      finalize_report: {
        Args: {
          p_actor: string
          p_expected: string
          p_id: string
          p_narrative: string
        }
        Returns: {
          created_at: string
          created_by: string
          facts: Json
          finalized_at: string | null
          finalized_by: string | null
          id: string
          narrative_md: string
          period_end: string
          period_start: string
          status: string
          type: string
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_integration_run: {
        Args: {
          p_cursor: string
          p_error: string
          p_failed: number
          p_id: string
          p_read: number
          p_status: string
          p_written: number
        }
        Returns: undefined
      }
      finish_webhook: {
        Args: {
          p_claim: string
          p_error: string
          p_id: string
          p_plan?: Json
          p_result: Json
          p_retry: string
          p_revision?: string
          p_scope?: Json
          p_status: string
        }
        Returns: undefined
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
      meta_health_facts: { Args: never; Returns: Json }
      performance_facts: {
        Args: { p_from: string; p_previous: string; p_to: string }
        Returns: Json
      }
      raise_alert: {
        Args: { p_alert: Json }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_dismissals: Json
          alert_key: string
          created_at: string
          dismissal_count: number
          dismissed_reason: string | null
          dismissed_until: string | null
          entity_id: string | null
          entity_type: string
          evidence: Json
          first_seen_at: string
          history: Json
          id: string
          last_notified_at: string | null
          last_seen_at: string
          message: string
          next_notification_at: string | null
          notification_attempts: number
          notification_count: number
          notification_status: string
          occurrence_count: number
          resolved_at: string | null
          resolved_reason: string | null
          severity: string
          snooze_until: string | null
          source: string
          status: string
          suppressed_at: string | null
          suppressed_by: string | null
          suppressed_reason: string | null
          suppressed_until: string | null
          title: string
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      raise_alert_batch: { Args: { p_alerts: Json }; Returns: number }
      reactivate_due_alerts: { Args: { p_at: string }; Returns: number }
      record_alert_delivery: {
        Args: {
          p_error: string
          p_ids: string[]
          p_max: number
          p_next: string
          p_outcome: string
        }
        Returns: number
      }
      record_meta_failure: {
        Args: { p_code: string; p_run: string }
        Returns: undefined
      }
      resolve_missing_alerts: {
        Args: { p_active_keys: string[]; p_before: string; p_types: string[] }
        Returns: number
      }
      retry_webhook: { Args: { p_id: string }; Returns: boolean }
      run_retention: { Args: { p_now?: string }; Returns: Json }
      save_report_narrative: {
        Args: { p_expected: string; p_id: string; p_narrative: string }
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
      start_job: {
        Args: { p_correlation: string; p_key: string; p_trigger: string }
        Returns: string
      }
      transition_alert: {
        Args: {
          p_action: string
          p_actor: string
          p_id: string
          p_reason: string
          p_until?: string
        }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_dismissals: Json
          alert_key: string
          created_at: string
          dismissal_count: number
          dismissed_reason: string | null
          dismissed_until: string | null
          entity_id: string | null
          entity_type: string
          evidence: Json
          first_seen_at: string
          history: Json
          id: string
          last_notified_at: string | null
          last_seen_at: string
          message: string
          next_notification_at: string | null
          notification_attempts: number
          notification_count: number
          notification_status: string
          occurrence_count: number
          resolved_at: string | null
          resolved_reason: string | null
          severity: string
          snooze_until: string | null
          source: string
          status: string
          suppressed_at: string | null
          suppressed_by: string | null
          suppressed_reason: string | null
          suppressed_until: string | null
          title: string
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "alerts"
          isOneToOne: true
          isSetofReturn: false
        }
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
