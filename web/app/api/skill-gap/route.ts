import { NextRequest, NextResponse } from 'next/server';
import type { CvProfile } from '@/types/cv';
import { computeSkillGap } from '@/lib/skillGap';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const profile: CvProfile | null = body.profile ?? null;
    const jobText = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';

    if (!profile || !jobText) {
      return NextResponse.json({ error: 'profile and jobDescription are required' }, { status: 400 });
    }

    return NextResponse.json(computeSkillGap(profile, jobText));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
