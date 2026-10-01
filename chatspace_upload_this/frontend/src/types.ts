export interface User {
  id: number;
  username: string;
  role: 'OWNER' | 'OPERATOR';
  fullName: string;
}

export interface Lady {
  id: number;
  lady_id: string;
  name: string;
  proxy_url?: string;
  status: 'active' | 'paused';
  online_status: 'online' | 'offline' | 'in_chat';
  daily_admirer_limit: number;
  avatar_url?: string;
  assigned_operator_name?: string;
  assigned_operator_id?: number;
  assignment_id?: number;
  shift_start?: string;
  shift_end?: string;
  admirer_sent_today?: number;
  admirer_limit?: number;
}

export interface Operator {
  id: number;
  username: string;
  role: string;
  full_name: string;
  commission_percentage?: number;
  created_at: string;
}

export interface Chat {
  id: number;
  lady_id: string;
  lady_name: string;
  lady_avatar?: string;
  man_id: string;
  man_name: string;
  man_age: number;
  man_country: string;
  status: 'active' | 'paused' | 'closed';
  last_message?: string;
  last_message_time?: string;
  last_sender_type?: 'lady' | 'man' | 'system';
}

export interface Message {
  id: number;
  chat_id: number;
  lady_id: string;
  man_id: string;
  sender_type: 'lady' | 'man' | 'system';
  text: string;
  translated_text?: string;
  sent_at: string;
}

export interface Template {
  id: number;
  type: 'invite' | 'quick_reply' | 'admirer_a' | 'admirer_b' | 'first_emf';
  title: string;
  text: string;
}

export interface FanCRM {
  lady_id: string;
  man_id: string;
  man_name: string;
  notes: string;
  tags: string;
  spent_credits: number;
  eligible_for_first_emf: number;
}
