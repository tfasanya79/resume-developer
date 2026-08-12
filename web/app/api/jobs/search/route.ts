import { NextRequest, NextResponse } from "next/server";
import type { JobListing } from "@/types/cv";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface RemoteOkJob {
  id?: string;
  position?: string;
  company?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  url?: string;
  description?: string;
  tags?: string[];
}

async function fetchRemoteOk(remoteOnly: boolean): Promise<JobListing[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "ResumeDeveloper/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const raw: unknown[] = await res.json();
    const listings: JobListing[] = [];
    // RemoteOK's first array element is a legal notice, not a job — skip it.
    for (const item of raw.slice(1)) {
      const job = item as RemoteOkJob;
      if (!job.position || !job.company) continue;
      const location = job.location || "Remote";
      if (remoteOnly && !location.toLowerCase().includes("remote")) continue;
      const salary =
        job.salary_min && job.salary_max
          ? `$${job.salary_min}-$${job.salary_max}`
          : job.salary_min
            ? `$${job.salary_min}+`
            : "";
      const tags = job.tags?.join(", ") || "";
      const cleanDescription = (job.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const description = cleanDescription ? `${cleanDescription}\n\nSkills: ${tags}` : tags;
      listings.push({
        id: `remoteok-${job.id ?? Math.random()}`,
        title: job.position,
        company: job.company,
        location,
        salary,
        url: job.url || "",
        description,
        source: "RemoteOK",
        match_score: null,
        created_at: new Date().toISOString(),
      });
    }
    return listings.slice(0, 60);
  } catch {
    return [];
  }
}

interface ArbeitnowJob {
  title?: string;
  company_name?: string;
  location?: string;
  url?: string;
  description?: string;
  remote?: boolean;
}

async function fetchArbeitnow(remoteOnly: boolean): Promise<JobListing[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { "User-Agent": "ResumeDeveloper/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data: { data?: ArbeitnowJob[] } = await res.json();
    const jobs = data.data ?? [];
    return jobs
      .filter((j) => !remoteOnly || j.remote || (j.location || "").toLowerCase().includes("remote"))
      .slice(0, 60)
      .map((j) => ({
        id: `arbeitnow-${j.url ?? Math.random()}`,
        title: j.title || "Untitled role",
        company: j.company_name || "Unknown",
        location: j.location || "",
        salary: "",
        url: j.url || "",
        // Arbeitnow descriptions are raw HTML — strip tags for plain-text matching/display.
        description: (j.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        source: "Arbeitnow",
        match_score: null,
        created_at: new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const remoteOnly = searchParams.get("remoteOnly") === "true";
  const sources = (searchParams.get("sources") || "remoteok,arbeitnow").split(",");

  const [remoteOk, arbeitnow] = await Promise.all([
    sources.includes("remoteok") ? fetchRemoteOk(remoteOnly) : Promise.resolve([]),
    sources.includes("arbeitnow") ? fetchArbeitnow(remoteOnly) : Promise.resolve([]),
  ]);

  let listings = [...remoteOk, ...arbeitnow];
  if (q) {
    listings = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ listings: listings.slice(0, 80) });
}

