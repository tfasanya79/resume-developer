import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/TopNav";
import { ApplicationsClient } from "./ApplicationsClient";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/applications");

  const [{ data: applications }, { data: cvs }] = await Promise.all([
    supabase.from("job_applications").select("*").order("updated_at", { ascending: false }),
    supabase.from("cv_profiles").select("id, name, template, updated_at").order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNav email={user.email} />
      <ApplicationsClient initialApplications={applications ?? []} cvs={cvs ?? []} />
    </div>
  );
}

