import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabaseInstance;
};

// Export a dummy object for types if needed, but we'll use getSupabase() in the app
export const supabase = getSupabase();

/**
 * SQL para criar a tabela no Supabase SQL Editor:
 * 
 * create table appointments (
 *   id uuid primary key default gen_random_uuid(),
 *   "fullName" text not null,
 *   cpf text not null,
 *   renach text not null,
 *   "appointmentDate" text not null,
 *   location text not null,
 *   contact text,
 *   "isFitVision" boolean default false,
 *   "isFitPsychologist" boolean default false,
 *   "isFitH572C" boolean default false,
 *   "isFitCP02A" boolean default false,
 *   "isFitLegislation" boolean default false,
 *   "isConfirmed" boolean default false,
 *   observations text,
 *   "appointmentTime" text,
 *   "serviceType" text,
 *   category text,
 *   "examType" text,
 *   "hasSgaCrtCall" boolean default false,
 *   "createdAt" timestamp with time zone default now(),
 *   "updatedAt" timestamp with time zone default now()
 * );
 * 
 * create table tickets (
 *   id uuid primary key default gen_random_uuid(),
 *   "appointmentId" uuid references appointments(id),
 *   "studentName" text not null,
 *   "studentCpf" text not null,
 *   type text not null,
 *   status text not null,
 *   description text not null,
 *   observations text,
 *   "createdAt" timestamp with time zone default now(),
 *   "updatedAt" timestamp with time zone default now()
 * );
 * 
 * -- Se a tabela já existir, rode apenas este comando:
 * alter table appointments add column if not exists "hasSgaCrtCall" boolean default false;
 * alter table appointments add column if not exists "result" text;
 * alter table appointments add column if not exists "updatedAt" timestamp with time zone default now();
 * 
 * alter table appointments enable row level security;
 * create policy "Public Access" on appointments for all using (true) with check (true);
 */
