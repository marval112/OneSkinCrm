
// --- CORE TYPES ---

export enum Segment {
  INDUSTRIAL = 'Industrial',
  DISTRIBUCION = 'Distribucion',
  OTROS = 'Otros',
}

export enum LeadStatus {
  New = 'New',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Lost = 'Lost',
  Won = 'Won',
}

export enum LeadSource {
  Website = 'Website',
  Referral = 'Referral',
  ColdCall = 'Cold Call',
  TradeShow = 'Trade Show',
  OnlineAd = 'Online Ad',
  Organic = 'Organic',
  Paid = 'Paid',
  LinkedIn = 'LinkedIn',
  Google = 'Google',
  Directory = 'Directory',
}

export interface Lead {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  segment: Segment;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  // Fields for rule-based scoring, not stored in DB
  engagement?: { email_opens: number; clicks: number };
  demographics?: { company_size: string; industry: string };
}

export enum CustomerStatus {
  Active = 'Active',
  Churned = 'Churned',
  Prospect = 'Prospect',
}

export interface Customer {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  segment: Segment;
  status: CustomerStatus;
  health_score: number;
  last_contact: string;
  created_at: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  parent_id: number | null;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  category_id: number | null;
  active: boolean;
}

export enum DealStage {
  QUALIFICATION = 'Qualification',
  PROPOSAL = 'Proposal',
  NEGOTIATION = 'Negotiation',
  CLOSED_WON = 'Closed Won',
  CLOSED_LOST = 'Closed Lost',
}

export interface Deal {
  id: number;
  user_id: number;
  title: string;
  customer_id: number;
  lead_id?: number | null;
  value: number;
  status: DealStage;
  probability: number;
  expected_close_date: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

// --- TASKS ---
export enum TaskStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export enum TaskType {
  FOLLOW_UP_CALL = 'Follow Up Call',
  SEND_INFORMATION = 'Send Information',
  SEND_SAMPLES = 'Send Samples',
  SEND_QUOTATION = 'Send Quotation',
  SCHEDULE_VISIT = 'Schedule Visit',
}

export interface Task {
  id: number;
  user_id: number;
  lead_id?: number | null;
  customer_id?: number | null;
  type: TaskType;
  status: TaskStatus;
  title?: string;
  notes?: string;
  rule_title?: string;
  due_date?: string | null;
  created_at: string;
  completed_at?: string | null;
}

// --- ENTERPRISE & SHARED TYPES ---

export interface User {
  id: number;
  email: string;
  role: 'Admin' | 'Commercial';
  seller_code?: string | null;
}

export interface Country {
  code: string;
  name: string;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  lead_id?: number | null;
  customer_id?: number | null;
  deal_id?: number | null;
  channel: ActivityChannel;
  direction?: 'in' | 'out';
  subject?: string;
  message?: string;
  to?: string[];
  from?: string;
  created_at: string;
  attachments?: ActivityAttachment[];
}

export type ActivityChannel = 'email' | 'call' | 'note' | 'meeting';

export interface ActivityAttachment {
  filename: string;
  content_type: string;
  size?: number;
  url?: string;
  base64?: string; // used when stored inline (small files) or from inbound webhook
}
