export type GardenRole = "owner" | "admin" | "member";

export type TaskStatus =
  | "open"
  | "assigned"
  | "pending_review"
  | "done"
  | "overdue"
  | "cancelled"
  | "postponed";

export type RecurrenceType = "none" | "weekly" | "monthly" | "seasonal" | "on_demand";

export type TaskEventType =
  | "created"
  | "assigned"
  | "reassigned"
  | "accepted"
  | "completed"
  | "reopened"
  | "postponed"
  | "cancelled"
  | "commented";

export type TaskTakeoverStatus = "pending" | "approved" | "rejected" | "cancelled";

export type GardenTransactionType = "expense" | "payment";

export type Profile = {
  id: string;
  display_name: string;
};

export type Garden = {
  id: string;
  name: string;
  created_by: string | null;
};

export type GardenMember = {
  id: string;
  garden_id: string;
  user_id: string;
  role: GardenRole;
  is_active: boolean;
  profiles?: Profile | null;
};

export type Task = {
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

export type TaskWithPeople = Task & {
  assigned_profile?: Profile | null;
  completed_profile?: Profile | null;
};

export type TaskTemplate = {
  id: string;
  garden_id: string | null;
  title: string;
  default_points: number;
  estimated_minutes: number;
  season_start_month: number;
  season_end_month: number;
  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  is_weather_dependent: boolean;
  is_active: boolean;
};

export type ScoreRow = {
  userId: string;
  displayName: string;
  points: number;
  lastCompletedAt: string | null;
};

export type AvailabilityWindow = {
  id?: string;
  user_id: string;
  garden_id: string;
  from_date: string;
  to_date: string;
  reason?: string | null;
  profiles?: Profile | null;
};

export type TaskComment = {
  id: string;
  task_id: string;
  garden_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: Profile | null;
};

export type TaskEvent = {
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
  actor_profile?: Profile | null;
};

export type Notification = {
  id: string;
  user_id: string;
  garden_id: string;
  type: string;
  title: string;
  message: string;
  related_task_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type GardenInvite = {
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

export type TaskTakeoverRequest = {
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
  requested_profile?: Profile | null;
  current_assignee_profile?: Profile | null;
};

export type GardenTransaction = {
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
  paid_by_profile?: Profile | null;
  paid_to_profile?: Profile | null;
};

export type GardenBillingSettings = {
  garden_id: string;
  hourly_rate_cents: number;
  point_hours: number;
};

export type MemberAdjustment = {
  id: string;
  garden_id: string;
  user_id: string;
  points_delta: number;
  amount_cents_delta: number;
  reason: string;
  created_by: string | null;
  created_at: string;
  profiles?: Profile | null;
};

export type NotificationContact = {
  user_id: string;
  garden_id: string;
  whatsapp_phone: string | null;
  telegram_chat_id: string | null;
  telegram_enabled: boolean;
  in_app_enabled: boolean;
};
