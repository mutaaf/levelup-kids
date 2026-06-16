// AUTO-GENERATED from supabase/migrations/0001_init.sql.
//
// Regenerate via: `npm run db:types` (wraps `supabase gen types typescript
// --local`). Hand-edit DISCOURAGED — a diff between this file and the live
// schema is a bug; the regen script is the fix. We commit this file so
// `tsc --noEmit` in CI doesn't depend on a live Supabase.
//
// Shape mirrors the @supabase/supabase-js `Database` generic so a future
// `createClient<Database>()` call gets per-table typing for free.

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          subscription_tier: "free" | "premium";
          focus_pillars: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subscription_tier?: "free" | "premium";
          focus_pillars?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subscription_tier?: "free" | "premium";
          focus_pillars?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      parents: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          email: string;
          role: "admin" | "parent";
          created_at: string;
        };
        Insert: {
          id: string;
          household_id: string;
          name: string;
          email: string;
          role?: "admin" | "parent";
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          email?: string;
          role?: "admin" | "parent";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parents_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      children: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          age: number;
          avatar: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          age: number;
          avatar: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          age?: number;
          avatar?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "children_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      quest_templates: {
        Row: {
          id: string;
          title: string;
          description: string;
          pillar: string;
          type: "daily" | "weekly" | "monthly";
          difficulty: number;
          xp_reward: number;
          min_age: number;
          max_age: number;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          pillar: string;
          type: "daily" | "weekly" | "monthly";
          difficulty?: number;
          xp_reward: number;
          min_age?: number;
          max_age?: number;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          pillar?: string;
          type?: "daily" | "weekly" | "monthly";
          difficulty?: number;
          xp_reward?: number;
          min_age?: number;
          max_age?: number;
        };
        Relationships: [];
      };
      quests: {
        Row: {
          id: string;
          child_id: string;
          template_id: string | null;
          title: string;
          description: string;
          pillar: string;
          type: "daily" | "weekly" | "monthly";
          difficulty: number;
          xp_reward: number;
          assigned_for: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          template_id?: string | null;
          title: string;
          description: string;
          pillar: string;
          type: "daily" | "weekly" | "monthly";
          difficulty?: number;
          xp_reward: number;
          assigned_for: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          template_id?: string | null;
          title?: string;
          description?: string;
          pillar?: string;
          type?: "daily" | "weekly" | "monthly";
          difficulty?: number;
          xp_reward?: number;
          assigned_for?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quests_child_id_fkey";
            columns: ["child_id"];
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quests_template_id_fkey";
            columns: ["template_id"];
            referencedRelation: "quest_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      quest_completions: {
        Row: {
          id: string;
          quest_id: string;
          child_id: string;
          completed_at: string;
          approved_by: string | null;
          approved_at: string | null;
          xp_awarded: number;
        };
        Insert: {
          id?: string;
          quest_id: string;
          child_id: string;
          completed_at?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          xp_awarded?: number;
        };
        Update: {
          id?: string;
          quest_id?: string;
          child_id?: string;
          completed_at?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quest_completions_quest_id_fkey";
            columns: ["quest_id"];
            referencedRelation: "quests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quest_completions_child_id_fkey";
            columns: ["child_id"];
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quest_completions_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: number;
          household_id: string | null;
          parent_id: string | null;
          child_id: string | null;
          name: string;
          props: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: number;
          household_id?: string | null;
          parent_id?: string | null;
          child_id?: string | null;
          name: string;
          props?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: number;
          household_id?: string | null;
          parent_id?: string | null;
          child_id?: string | null;
          name?: string;
          props?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_parent_id_fkey";
            columns: ["parent_id"];
            referencedRelation: "parents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_child_id_fkey";
            columns: ["child_id"];
            referencedRelation: "children";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      levelup_test_table_names: {
        Args: Record<string, never>;
        Returns: string[];
      };
      levelup_test_rls_status: {
        Args: Record<string, never>;
        Returns: Array<{ table_name: string; rls_enabled: boolean }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
