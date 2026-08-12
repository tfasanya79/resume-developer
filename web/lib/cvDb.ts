import { createClient } from "@/lib/supabase/client";
import type { CvProfile, CvSummary } from "@/types/cv";
import { createEmptyCv, normalizePersonal, normalizeSectionOrder } from "@/types/cv";

// Maps between the Supabase `cv_profiles` row shape and the app's CvProfile type.

interface CvRow {
  id: string;
  name: string;
  template: string;
  professional_title: string | null;
  personal: CvProfile["personal"];
  experience: CvProfile["experience"];
  education: CvProfile["education"];
  skills: string[];
  projects: CvProfile["projects"];
  certifications: CvProfile["certifications"];
  courses: CvProfile["courses"];
  languages: CvProfile["languages"];
  section_order: string[];
  design: CvProfile["design"];
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: CvRow): CvProfile {
  return {
    id: row.id,
    name: row.name,
    template: row.template,
    section_order: normalizeSectionOrder(row.section_order ?? []),
    professional_title: row.professional_title ?? "",
    personal: normalizePersonal(row.personal ?? createEmptyCv().personal),
    experience: row.experience ?? [],
    education: row.education ?? [],
    skills: row.skills ?? [],
    projects: row.projects ?? [],
    certifications: row.certifications ?? [],
    courses: row.courses ?? [],
    languages: row.languages ?? [],
    competence_notes: [],
    design: row.design ?? { accent_color: "#2563eb", font_pair: "system", photo_path: "" },
    source_filename: row.source_filename,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function profileToRow(profile: CvProfile) {
  return {
    name: profile.name || "Untitled CV",
    template: profile.template,
    professional_title: profile.professional_title,
    personal: profile.personal,
    experience: profile.experience,
    education: profile.education,
    skills: profile.skills,
    projects: profile.projects,
    certifications: profile.certifications,
    courses: profile.courses,
    languages: profile.languages,
    section_order: profile.section_order,
    design: profile.design,
  };
}

export async function listCvs(): Promise<CvSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cv_profiles")
    .select("id, name, template, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadCv(id: string): Promise<CvProfile> {
  const supabase = createClient();
  const { data, error } = await supabase.from("cv_profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return rowToProfile(data as CvRow);
}

export async function createCv(template?: string): Promise<CvProfile> {
  const supabase = createClient();
  const empty = createEmptyCv();
  if (template) empty.template = template;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("cv_profiles")
    .insert({ ...profileToRow(empty), user_id: user.id })
    .select("*")
    .single();
  if (error) throw error;
  return rowToProfile(data as CvRow);
}

export async function saveCv(profile: CvProfile): Promise<CvProfile> {
  const supabase = createClient();
  const normalized = { ...profile, personal: normalizePersonal(profile.personal) };

  if (!normalized.id) {
    return createCv(normalized.template);
  }

  const { data, error } = await supabase
    .from("cv_profiles")
    .update(profileToRow(normalized))
    .eq("id", normalized.id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToProfile(data as CvRow);
}

export async function deleteCv(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("cv_profiles").delete().eq("id", id);
  if (error) throw error;
}
