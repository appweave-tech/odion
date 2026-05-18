export type Villa = {
  id: string;
  phase: string;
  number: number;
  label: string;
  display_order: number | null;
  auto_created: boolean;
  verified: boolean;
  created_at: string;
};

export type Device = {
  id: string;
  villa_id: string | null;
  name: string | null;
  phone: string | null;
  user_agent: string | null;
  first_seen: string;
  last_seen: string;
};

export type SkipEvent = {
  id: string;
  villa_id: string;
  skip_date: string;
  reported_by_device: string | null;
  note: string | null;
  supersedes_event_id: string | null;
  void: boolean;
  created_at: string;
};

export type SkipEventWithVilla = SkipEvent & {
  villa_phase: string;
  villa_number: number;
  villa_label: string;
  reporter_name: string | null;
};

export type InsightsIngest = {
  id: string;
  filename: string;
  uploaded_at: string;
  raw_size_bytes: number | null;
  parsed_count: number;
  inserted_count: number;
  classified_count: number;
  chat_first_ts: string | null;
  chat_last_ts: string | null;
  status: 'pending' | 'parsed' | 'classified' | 'failed';
  error: string | null;
};

export type InsightsCategory = {
  key: string;
  label: string;
  emoji: string | null;
  color: string | null;
  display_order: number;
};

export type CategoryStat = {
  category: string;
  label: string;
  emoji: string | null;
  color: string | null;
  total: number;
  last30: number;
  last7: number;
  complaints7: number;
};

export type LiveIssue = {
  category: string;
  label: string;
  emoji: string | null;
  color: string | null;
  recent_count: number;
  unique_senders: number;
  last_ts: string;
  sample_bodies: string[];
};

export type TrendBucket = {
  week_start: string;
  category: string;
  count: number;
};
