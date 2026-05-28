import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are not fully configured. Some features may not work.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Type definitions for database tables
export interface CandidateData {
  id?: string;
  test_id: string;
  full_name: string;
  email: string;
  final_score?: number;
  coding_score?: number;
  penalty_score?: number;
  decision?: string;
  suggested_role?: string;
  resume_text?: string;
  ai_evaluation?: any;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobOpeningData {
  id?: string;
  role: string;
  description: string;
  requirements: string[];
  created_at?: string;
  updated_at?: string;
}

// Candidate operations
export const candidateOperations = {
  async create(candidate: CandidateData) {
    const { data, error } = await supabase
      .from('candidates')
      .upsert([candidate], { onConflict: 'test_id' })
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(testId: string) {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('test_id', testId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async update(testId: string, updates: Partial<CandidateData>) {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('test_id', testId)
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async delete(testId: string) {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('test_id', testId);
    
    if (error) throw error;
  },
};

// Job opening operations
export const jobOperations = {
  async create(job: Omit<JobOpeningData, 'id'>) {
    const { data, error } = await supabase
      .from('jobs')
      .insert([job])
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async update(id: string, updates: Partial<JobOpeningData>) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  },
};
