export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string;
          actual_minutes: number;
          completed_at: string | null;
          created_at: string;
          deadline_at: string;
          deadline_has_time: boolean;
          deadline_local_date: string;
          deadline_local_time: string | null;
          deadline_timezone: string;
          discipline_id: string | null;
          estimated_minutes: number;
          id: string;
          notes_markdown: string | null;
          priority: number;
          revision: number;
          source: string;
          source_external_id: string | null;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          actual_minutes?: number;
          completed_at?: string | null;
          created_at?: string;
          deadline_at: string;
          deadline_has_time: boolean;
          deadline_local_date: string;
          deadline_local_time?: string | null;
          deadline_timezone: string;
          discipline_id?: string | null;
          estimated_minutes: number;
          id?: string;
          notes_markdown?: string | null;
          priority?: number;
          revision?: number;
          source?: string;
          source_external_id?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          actual_minutes?: number;
          completed_at?: string | null;
          created_at?: string;
          deadline_at?: string;
          deadline_has_time?: boolean;
          deadline_local_date?: string;
          deadline_local_time?: string | null;
          deadline_timezone?: string;
          discipline_id?: string | null;
          estimated_minutes?: number;
          id?: string;
          notes_markdown?: string | null;
          priority?: number;
          revision?: number;
          source?: string;
          source_external_id?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_discipline_owner_fk";
            columns: ["user_id", "discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      activity_links: {
        Row: {
          activity_id: string;
          created_at: string;
          id: string;
          label: string | null;
          position: number;
          revision: number;
          updated_at: string;
          url: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          position?: number;
          revision?: number;
          updated_at?: string;
          url: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          position?: number;
          revision?: number;
          updated_at?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_links_activity_owner_fk";
            columns: ["user_id", "activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "activity_links_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      alerts: {
        Row: {
          action_code: string;
          cause_code: string;
          created_at: string;
          dedupe_key: string;
          id: string;
          impact: Json;
          resolved_at: string | null;
          revision: number;
          severity: string;
          subject_id: string | null;
          subject_type: string | null;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action_code: string;
          cause_code: string;
          created_at?: string;
          dedupe_key: string;
          id?: string;
          impact?: Json;
          resolved_at?: string | null;
          revision?: number;
          severity: string;
          subject_id?: string | null;
          subject_type?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action_code?: string;
          cause_code?: string;
          created_at?: string;
          dedupe_key?: string;
          id?: string;
          impact?: Json;
          resolved_at?: string | null;
          revision?: number;
          severity?: string;
          subject_id?: string | null;
          subject_type?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      availability_windows: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_local: string;
          id: string;
          revision: number;
          start_local: string;
          status: string;
          timezone: string;
          updated_at: string;
          user_id: string;
          valid_from: string;
          valid_until: string | null;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_local: string;
          id?: string;
          revision?: number;
          start_local: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
          user_id: string;
          valid_from: string;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_local?: string;
          id?: string;
          revision?: number;
          start_local?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "availability_windows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      calendar_blocks: {
        Row: {
          created_at: string;
          day_of_week: number | null;
          end_local: string | null;
          ends_at: string | null;
          id: string;
          kind: string;
          revision: number;
          source: string;
          start_local: string | null;
          starts_at: string | null;
          timezone: string;
          title: string;
          updated_at: string;
          user_id: string;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          created_at?: string;
          day_of_week?: number | null;
          end_local?: string | null;
          ends_at?: string | null;
          id?: string;
          kind: string;
          revision?: number;
          source?: string;
          start_local?: string | null;
          starts_at?: string | null;
          timezone?: string;
          title: string;
          updated_at?: string;
          user_id: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          day_of_week?: number | null;
          end_local?: string | null;
          ends_at?: string | null;
          id?: string;
          kind?: string;
          revision?: number;
          source?: string;
          start_local?: string | null;
          starts_at?: string | null;
          timezone?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_blocks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      disciplines: {
        Row: {
          color_key: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          revision: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color_key?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          revision?: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color_key?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          revision?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disciplines_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      plan_conflict_activities: {
        Row: {
          activity_id: string;
          conflict_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          conflict_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          conflict_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_conflict_activities_activity_owner_fk";
            columns: ["user_id", "activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "plan_conflict_activities_conflict_owner_fk";
            columns: ["user_id", "conflict_id"];
            isOneToOne: false;
            referencedRelation: "plan_conflicts";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "plan_conflict_activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      plan_conflicts: {
        Row: {
          code: string;
          created_at: string;
          deficit_minutes: number;
          details: Json;
          first_affected_deadline_at: string;
          id: string;
          largest_available_window_minutes: number;
          plan_id: string;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          deficit_minutes: number;
          details?: Json;
          first_affected_deadline_at: string;
          id?: string;
          largest_available_window_minutes: number;
          plan_id: string;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          deficit_minutes?: number;
          details?: Json;
          first_affected_deadline_at?: string;
          id?: string;
          largest_available_window_minutes?: number;
          plan_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_conflicts_plan_owner_fk";
            columns: ["user_id", "plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "plan_conflicts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      plan_items: {
        Row: {
          change_kind: string;
          created_at: string;
          id: string;
          plan_id: string;
          planned_end_at: string;
          planned_minutes: number;
          planned_start_at: string;
          rationale_code: string;
          rationale_params: Json;
          session_id: string;
          user_id: string;
        };
        Insert: {
          change_kind: string;
          created_at?: string;
          id?: string;
          plan_id: string;
          planned_end_at: string;
          planned_minutes: number;
          planned_start_at: string;
          rationale_code: string;
          rationale_params?: Json;
          session_id: string;
          user_id: string;
        };
        Update: {
          change_kind?: string;
          created_at?: string;
          id?: string;
          plan_id?: string;
          planned_end_at?: string;
          planned_minutes?: number;
          planned_start_at?: string;
          rationale_code?: string;
          rationale_params?: Json;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_owner_fk";
            columns: ["user_id", "plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "plan_items_session_owner_fk";
            columns: ["user_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "plan_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      plans: {
        Row: {
          confirmed_at: string | null;
          created_at: string;
          feasibility: string;
          generation_reason: string;
          horizon_end_date: string;
          horizon_start_date: string;
          id: string;
          input_hash: string;
          output_hash: string;
          planner_version: string;
          published_at: string | null;
          requires_confirmation: boolean;
          rules_version: string;
          status: string;
          timezone: string;
          user_id: string;
          version: number;
        };
        Insert: {
          confirmed_at?: string | null;
          created_at?: string;
          feasibility: string;
          generation_reason: string;
          horizon_end_date: string;
          horizon_start_date: string;
          id?: string;
          input_hash: string;
          output_hash: string;
          planner_version: string;
          published_at?: string | null;
          requires_confirmation?: boolean;
          rules_version: string;
          status?: string;
          timezone: string;
          user_id: string;
          version: number;
        };
        Update: {
          confirmed_at?: string | null;
          created_at?: string;
          feasibility?: string;
          generation_reason?: string;
          horizon_end_date?: string;
          horizon_start_date?: string;
          id?: string;
          input_hash?: string;
          output_hash?: string;
          planner_version?: string;
          published_at?: string | null;
          requires_confirmation?: boolean;
          rules_version?: string;
          status?: string;
          timezone?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          onboarding_completed_at: string | null;
          onboarding_status: string;
          onboarding_step: number;
          revision: number;
          timezone: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_status?: string;
          onboarding_step?: number;
          revision?: number;
          timezone?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_status?: string;
          onboarding_step?: number;
          revision?: number;
          timezone?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      session_executions: {
        Row: {
          actual_minutes: number | null;
          created_at: string;
          ended_at: string | null;
          id: string;
          revision: number;
          session_id: string;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          actual_minutes?: number | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          revision?: number;
          session_id: string;
          started_at: string;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          actual_minutes?: number | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          revision?: number;
          session_id?: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_executions_session_owner_fk";
            columns: ["user_id", "session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "session_executions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      study_sessions: {
        Row: {
          activity_id: string;
          created_at: string;
          created_by_plan_id: string | null;
          id: string;
          is_pinned: boolean;
          revision: number;
          skip_reason_code: string | null;
          skip_reason_other: string | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          created_by_plan_id?: string | null;
          id?: string;
          is_pinned?: boolean;
          revision?: number;
          skip_reason_code?: string | null;
          skip_reason_other?: string | null;
          source: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          created_by_plan_id?: string | null;
          id?: string;
          is_pinned?: boolean;
          revision?: number;
          skip_reason_code?: string | null;
          skip_reason_other?: string | null;
          source?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_activity_owner_fk";
            columns: ["user_id", "activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "study_sessions_plan_owner_fk";
            columns: ["user_id", "created_by_plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          capacity_reserve_percent: number;
          created_at: string;
          minimum_session_minutes: number;
          preferred_session_minutes: number;
          revision: number;
          updated_at: string;
          user_id: string;
          week_starts_on: number;
        };
        Insert: {
          capacity_reserve_percent?: number;
          created_at?: string;
          minimum_session_minutes?: number;
          preferred_session_minutes?: number;
          revision?: number;
          updated_at?: string;
          user_id: string;
          week_starts_on?: number;
        };
        Update: {
          capacity_reserve_percent?: number;
          created_at?: string;
          minimum_session_minutes?: number;
          preferred_session_minutes?: number;
          revision?: number;
          updated_at?: string;
          user_id?: string;
          week_starts_on?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      foundation_health: { Args: never; Returns: number };
      persist_plan_proposal: {
        Args: {
          p_correlation_id: string;
          p_expected_current_plan_id: string | null;
          p_generation_reason: string;
          p_input: Json;
          p_output: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
