import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/TopNav";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cvs } = await supabase
    .from("cv_profiles")
    .select("id, name, template, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNav email={user.email} />
      <DashboardClient initialCvs={cvs ?? []} />
    </div>
  );
}
