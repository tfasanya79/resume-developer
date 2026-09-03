import { NextRequest, NextResponse } from 'next/server';
import type { CvProfile } from '@/types/cv';
import { importCvFromPdf } from '@/lib/cvImport';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface CvRow extends Record<string, unknown> {
  id: string;
  name: string;
  template: string;
  parent_cv_id: string | null;
  job_id: string | null;
  professional_title: string | null;
  personal: CvProfile['personal'];
  experience: CvProfile['experience'];
  education: CvProfile['education'];
  skills: string[];
  projects: CvProfile['projects'];
  certifications: CvProfile['certifications'];
  courses: CvProfile['courses'];
  languages: CvProfile['languages'];
  section_order: string[];
  design: CvProfile['design'];
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: CvRow): CvProfile {
  return {
    id: row.id,
    name: row.name,
    template: row.template,
    parent_cv_id: row.parent_cv_id ?? null,
    job_id: row.job_id ?? null,
    section_order: row.section_order ?? ['personal', 'experience', 'education', 'skills'],
    professional_title: row.professional_title ?? '',
    personal: row.personal,
    experience: row.experience ?? [],
    education: row.education ?? [],
    skills: row.skills ?? [],
    projects: row.projects ?? [],
    certifications: row.certifications ?? [],
    courses: row.courses ?? [],
    languages: row.languages ?? [],
    competence_notes: [],
    design: row.design ?? { accent_color: '#2563eb', font_pair: 'system', photo_path: '' },
    source_filename: row.source_filename,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function profileToRow(profile: CvProfile) {
  return {
    name: profile.name || 'Imported CV',
    template: profile.template,
    parent_cv_id: profile.parent_cv_id ?? null,
    job_id: profile.job_id ?? null,
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
    source_filename: profile.source_filename ?? null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const cvId = String(formData.get('cvId') || '').trim();

    const upload =
      file &&
      typeof file === 'object' &&
      'name' in file &&
      'arrayBuffer' in file &&
      typeof file.name === 'string' &&
      typeof file.arrayBuffer === 'function'
        ? file
        : null;

    if (!upload) {
      return NextResponse.json({ error: 'Upload a PDF file.' }, { status: 400 });
    }
    if (!upload.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    let existingProfile: CvProfile | null = null;
    if (cvId) {
      const { data: existingRow, error: existingError } = await supabase
        .from('cv_profiles')
        .select('*')
        .eq('id', cvId)
        .eq('user_id', user.id)
        .single();
      if (existingError || !existingRow) {
        return NextResponse.json({ error: 'CV not found.' }, { status: 404 });
      }
      existingProfile = rowToProfile(existingRow as CvRow);
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    const result = await importCvFromPdf(buffer, upload.name, existingProfile);

    let savedRow;
    if (cvId && existingProfile) {
      const { data, error } = await supabase
        .from('cv_profiles')
        .update(profileToRow({ ...result.profile, id: cvId }))
        .eq('id', cvId)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      savedRow = data;
    } else {
      const { data, error } = await supabase
        .from('cv_profiles')
        .insert({ ...profileToRow(result.profile), user_id: user.id })
        .select('*')
        .single();
      if (error) throw error;
      savedRow = data;
    }

    return NextResponse.json({
      ...result,
      profile: rowToProfile(savedRow as CvRow),
    });
  } catch (error) {
    console.error('CV import failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
