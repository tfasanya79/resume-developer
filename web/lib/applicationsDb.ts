import { createClient } from "@/lib/supabase/client";
import type { JobApplicationRecord, NewJobApplication, ApplicationStatus } from "@/types/cv";

// Maps CRUD operations onto the Supabase `job_applications` table (RLS-scoped to auth.uid()).

export async function listApplications(): Promise<JobApplicationRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobApplicationRecord[];
}

export async function getApplication(id: string): Promise<JobApplicationRecord> {
  const supabase = createClient();
  const { data, error } = await supabase.from("job_applications").select("*").eq("id", id).single();
  if (error) throw error;
  return data as JobApplicationRecord;
}

export async function createApplication(input: NewJobApplication): Promise<JobApplicationRecord> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("job_applications")
    .insert({ ...input, status: input.status ?? "wishlist", user_id: user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as JobApplicationRecord;
}

export async function updateApplication(
  id: string,
  patch: Partial<NewJobApplication>,
): Promise<JobApplicationRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as JobApplicationRecord;
}

// Updates status and auto-stamps the matching date column (applied_date, interview_date, etc.)
// the first time an application moves into that stage, so users don't have to fill dates by hand.
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  current: JobApplicationRecord,
): Promise<JobApplicationRecord> {
  const patch: Partial<NewJobApplication> = { status };
  const today = new Date().toISOString().slice(0, 10);
  if (status === "applied" && !current.applied_date) patch.applied_date = today;
  if (status === "interviewing" && !current.interview_date) patch.interview_date = new Date().toISOString();
  if (status === "offered" && !current.offer_date) patch.offer_date = today;
  if (status === "rejected" && !current.rejection_date) patch.rejection_date = today;
  return updateApplication(id, patch);
}

export async function deleteApplication(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("job_applications").delete().eq("id", id);
  if (error) throw error;
}

