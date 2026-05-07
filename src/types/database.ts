import type {
  GardenRole,
  GardenTransactionType,
  RecurrenceType,
  TaskEventType,
  TaskStatus,
  TaskTakeoverStatus,
} from "./domain";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; created_at: string; updated_at: string };
        Insert: { id: string; display_name: string; created_at?: string; updated_at?: string };
        Update: { id?: string; display_name?: string; created_at?: string; updated_at?: string };
      };
      gardens: {
        Row: { id: string; name: string; created_by: string | null; chat_retention_days: number; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; created_by?: string | null; chat_retention_days?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; created_by?: string | null; chat_retention_days?: number; created_at?: string; updated_at?: string };
      };
      garden_members: {
        Row: { id: string; garden_id: string; user_id: string; role: GardenRole; is_active: boolean; joined_at: string };
        Insert: { id?: string; garden_id: string; user_id: string; role?: GardenRole; is_active?: boolean; joined_at?: string };
        Update: { id?: string; garden_id?: string; user_id?: string; role?: GardenRole; is_active?: boolean; joined_at?: string };
      };
      garden_invites: {
        Row: {
          id: string;
          garden_id: string;
          email: string | null;
          role: GardenRole;
          token: string;
          created_by: string | null;
          accepted_by: string | null;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["garden_invites"]["Row"]> & {
          garden_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["garden_invites"]["Row"]>;
      };
      task_templates: {
        Row: {
          id: string;
          garden_id: string | null;
          title: string;
          default_points: number;
          estimated_minutes: number;
          season_start_month: number;
          season_end_month: number;
          recurrence_type: RecurrenceType;
          recurrence_interval: number;
          custom_interval_days: number | null;
          season_start_day: number;
          season_end_day: number;
          is_weather_dependent: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_templates"]["Row"]> & {
          title: string;
          default_points: number;
          estimated_minutes: number;
          season_start_month: number;
          season_end_month: number;
        };
        Update: Partial<Database["public"]["Tables"]["task_templates"]["Row"]>;
      };
      tasks: {
        Row: {
          id: string;
          garden_id: string;
          template_id: string | null;
          title: string;
          description: string | null;
          points: number;
          status: TaskStatus;
          due_date: string | null;
          assigned_to: string | null;
          original_assignee: string | null;
          completed_by: string | null;
          completed_at: string | null;
          created_by: string | null;
          assignment_locked: boolean;
          locked_by: string | null;
          locked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          garden_id: string;
          title: string;
          points: number;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      };
      task_events: {
        Row: {
          id: string;
          task_id: string | null;
          garden_id: string;
          actor_id: string | null;
          event_type: TaskEventType;
          from_user_id: string | null;
          to_user_id: string | null;
          points_delta: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_events"]["Row"]> & {
          garden_id: string;
          event_type: TaskEventType;
        };
        Update: Partial<Database["public"]["Tables"]["task_events"]["Row"]>;
      };
      task_comments: {
        Row: { id: string; task_id: string; garden_id: string; user_id: string; comment: string; created_at: string };
        Insert: { id?: string; task_id: string; garden_id: string; user_id: string; comment: string; created_at?: string };
        Update: { comment?: string };
      };
      availability: {
        Row: { id: string; user_id: string; garden_id: string; from_date: string; to_date: string; reason: string | null; created_at: string };
        Insert: { id?: string; user_id: string; garden_id: string; from_date: string; to_date: string; reason?: string | null; created_at?: string };
        Update: { from_date?: string; to_date?: string; reason?: string | null };
      };
      notifications: {
        Row: { id: string; user_id: string; garden_id: string; type: string; title: string; message: string; related_task_id: string | null; read_at: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          garden_id: string;
          type: string;
          title: string;
          message: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      task_takeover_requests: {
        Row: {
          id: string;
          task_id: string;
          garden_id: string;
          requested_by: string;
          current_assignee: string | null;
          status: TaskTakeoverStatus;
          decided_by: string | null;
          decided_at: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["task_takeover_requests"]["Row"]> & {
          task_id: string;
          garden_id: string;
          requested_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_takeover_requests"]["Row"]>;
      };
      garden_transactions: {
        Row: {
          id: string;
          garden_id: string;
          type: GardenTransactionType;
          title: string;
          amount_cents: number;
          paid_by: string;
          paid_to: string | null;
          occurred_on: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["garden_transactions"]["Row"]> & {
          garden_id: string;
          type: GardenTransactionType;
          title: string;
          amount_cents: number;
          paid_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["garden_transactions"]["Row"]>;
      };
      garden_billing_settings: {
        Row: {
          garden_id: string;
          hourly_rate_cents: number;
          point_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          garden_id: string;
          hourly_rate_cents?: number;
          point_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          hourly_rate_cents?: number;
          point_hours?: number;
          updated_at?: string;
        };
      };
      member_adjustments: {
        Row: {
          id: string;
          garden_id: string;
          user_id: string;
          points_delta: number;
          amount_cents_delta: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          garden_id: string;
          user_id: string;
          points_delta?: number;
          amount_cents_delta?: number;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["member_adjustments"]["Row"]>;
      };
      garden_chat_messages: {
        Row: {
          id: string;
          garden_id: string;
          author_id: string | null;
          content: string;
          message_type: string;
          visible_to_user_id: string | null;
          related_task_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          garden_id: string;
          author_id?: string | null;
          content: string;
          message_type?: string;
          visible_to_user_id?: string | null;
          related_task_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["garden_chat_messages"]["Row"]>;
      };
      garden_chat_mentions: {
        Row: { id: string; message_id: string; user_id: string };
        Insert: { id?: string; message_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["garden_chat_mentions"]["Row"]>;
      };
      notification_contacts: {
        Row: {
          user_id: string;
          garden_id: string;
          whatsapp_phone: string | null;
          telegram_chat_id: string | null;
          telegram_enabled: boolean;
          in_app_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          garden_id: string;
          whatsapp_phone?: string | null;
          telegram_chat_id?: string | null;
          telegram_enabled?: boolean;
          in_app_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_contacts"]["Row"]>;
      };
      web_push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          garden_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          garden_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["web_push_subscriptions"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_garden_invite: {
        Args: { invite_token: string };
        Returns: string;
      };
      create_garden_with_owner: {
        Args: { garden_name: string };
        Returns: string;
      };
      restore_garden_creator_owner: {
        Args: { target_garden_id: string };
        Returns: void;
      };
      leave_garden: {
        Args: { target_garden_id: string };
        Returns: void;
      };
      delete_garden: {
        Args: { target_garden_id: string };
        Returns: void;
      };
    };
    Enums: {
      garden_role: GardenRole;
      task_status: TaskStatus;
      recurrence_type: RecurrenceType;
      task_event_type: TaskEventType;
      task_takeover_status: TaskTakeoverStatus;
      garden_transaction_type: GardenTransactionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
