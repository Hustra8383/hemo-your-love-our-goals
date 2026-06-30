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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      check_ins: {
        Row: {
          couple_id: string | null
          created_at: string
          id: string
          kind: string
          meta: Json | null
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json | null
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          her_nickname: string | null
          him_nickname: string | null
          id: string
          relationship_start: string | null
          user_a: string
          user_b: string | null
        }
        Insert: {
          created_at?: string
          her_nickname?: string | null
          him_nickname?: string | null
          id?: string
          relationship_start?: string | null
          user_a: string
          user_b?: string | null
        }
        Update: {
          created_at?: string
          her_nickname?: string | null
          him_nickname?: string | null
          id?: string
          relationship_start?: string | null
          user_a?: string
          user_b?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          couple_id: string | null
          created_at: string
          description: string | null
          done: boolean
          due_date: string | null
          emoji: string | null
          id: string
          progress: number
          scope: string
          shared: boolean
          title: string
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          emoji?: string | null
          id?: string
          progress?: number
          scope?: string
          shared?: boolean
          title: string
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          emoji?: string | null
          id?: string
          progress?: number
          scope?: string
          shared?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          logged_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          logged_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          logged_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string
          emoji: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          couple_id: string
          created_at: string
          created_by: string
          expires_at: string
          used: boolean
        }
        Insert: {
          code: string
          couple_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          used?: boolean
        }
        Update: {
          code?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          caption: string | null
          couple_id: string
          created_at: string
          favorite: boolean
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          couple_id: string
          created_at?: string
          favorite?: boolean
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          couple_id?: string
          created_at?: string
          favorite?: boolean
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          category: string | null
          couple_id: string
          created_at: string
          duration_ms: number | null
          id: string
          kind: string
          media_url: string | null
          reaction: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          couple_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind: string
          media_url?: string | null
          reaction?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          couple_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind?: string
          media_url?: string | null
          reaction?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          couple_id: string
          created_at: string
          emoji: string | null
          id: string
          occurred_on: string
          title: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          emoji?: string | null
          id?: string
          occurred_on: string
          title: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          emoji?: string | null
          id?: string
          occurred_on?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      moods: {
        Row: {
          couple_id: string | null
          created_at: string
          emoji: string | null
          id: string
          mood: string
          note: string | null
          user_id: string
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          mood: string
          note?: string | null
          user_id: string
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          mood?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moods_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          nickname: string | null
          pronoun_role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          nickname?: string | null
          pronoun_role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          nickname?: string | null
          pronoun_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          achievement: string | null
          best_moment: string | null
          couple_id: string | null
          created_at: string
          for_date: string
          grateful_for: string | null
          hardest_moment: string | null
          id: string
          improve: string | null
          message: string | null
          user_id: string
        }
        Insert: {
          achievement?: string | null
          best_moment?: string | null
          couple_id?: string | null
          created_at?: string
          for_date?: string
          grateful_for?: string | null
          hardest_moment?: string | null
          id?: string
          improve?: string | null
          message?: string | null
          user_id: string
        }
        Update: {
          achievement?: string | null
          best_moment?: string | null
          couple_id?: string | null
          created_at?: string
          for_date?: string
          grateful_for?: string | null
          hardest_moment?: string | null
          id?: string
          improve?: string | null
          message?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          activity: string | null
          couple_id: string | null
          custom_text: string | null
          estimated_finish: string | null
          focus_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity?: string | null
          couple_id?: string | null
          custom_text?: string | null
          estimated_finish?: string | null
          focus_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string | null
          couple_id?: string | null
          custom_text?: string | null
          estimated_finish?: string | null
          focus_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      time_capsules: {
        Row: {
          author_id: string
          body: string
          couple_id: string
          created_at: string
          id: string
          opened: boolean
          title: string | null
          unlock_at: string
        }
        Insert: {
          author_id: string
          body: string
          couple_id: string
          created_at?: string
          id?: string
          opened?: boolean
          title?: string | null
          unlock_at: string
        }
        Update: {
          author_id?: string
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          opened?: boolean
          title?: string | null
          unlock_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_capsules_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_couple_member: {
        Args: { _couple_id: string; _user_id: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
