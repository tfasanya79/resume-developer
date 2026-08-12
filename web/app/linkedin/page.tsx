import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/TopNav";
import { LinkedInOptimizerClient } from "@/components/linkedin/LinkedInOptimizerClient";

export default async function LinkedInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/linkedin");

  const { data: cvs } = await supabase
    .from("cv_profiles")
    .select("id, name, template, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNav email={user.email} />
      <LinkedInOptimizerClient cvs={cvs ?? []} />
    </div>
  );
}

