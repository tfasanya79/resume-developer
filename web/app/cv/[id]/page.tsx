import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/layout/TopNav";
import { CvBuilderClient } from "./CvBuilderClient";

export default async function CvEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/cv/${id}`);

  const { data: cv, error } = await supabase.from("cv_profiles").select("*").eq("id", id).single();
  if (error || !cv) notFound();

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-950">
      <TopNav email={user.email} />
      <div className="flex-1 overflow-hidden">
        <CvBuilderClient initialRow={cv} />
      </div>
    </div>
  );
}
