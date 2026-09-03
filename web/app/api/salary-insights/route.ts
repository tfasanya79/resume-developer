import { NextRequest, NextResponse } from 'next/server';
import { getSalaryInsight } from '@/lib/salaryInsights';
import { extractJobMetadata } from '@/lib/tailor';
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
    const providedTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';
    const inferred = jobDescription ? extractJobMetadata(jobDescription) : { role: '', company: '' };
    const jobTitle = providedTitle || inferred.role;

    if (!jobTitle) {
      return NextResponse.json({ error: 'jobTitle or jobDescription is required' }, { status: 400 });
    }

    return NextResponse.json(await getSalaryInsight(jobTitle, location, jobDescription));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
