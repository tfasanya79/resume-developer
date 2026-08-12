import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/TopNav";
import { InterviewCoachClient } from "@/components/interview/InterviewCoachClient";

export default async function InterviewCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ cvId?: string; applicationId?: string }>;
}) {
  const { cvId, applicationId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/interview");

  const { data: cvs } = await supabase
    .from("cv_profiles")
    .select("id, name, template, updated_at")
    .order("updated_at", { ascending: false });

  let prefillJobDescription = "";
  if (applicationId) {
    const { data: app } = await supabase
      .from("job_applications")
      .select("job_description")
      .eq("id", applicationId)
      .single();
    prefillJobDescription = app?.job_description ?? "";
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNav email={user.email} />
      <InterviewCoachClient
        cvs={cvs ?? []}
        initialCvId={cvId}
        initialJobDescription={prefillJobDescription}
      />
    </div>
  );
}

