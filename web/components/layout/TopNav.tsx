"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TopNav({ email }: { email?: string | null }) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="font-bold">
            CV Builder
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-gray-500 sm:flex">
            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100">
              My CVs
            </Link>
            <Link href="/applications" className="hover:text-gray-900 dark:hover:text-gray-100">
              Applications
            </Link>
            <Link href="/jobs" className="hover:text-gray-900 dark:hover:text-gray-100">
              Job Search
            </Link>
            <Link href="/interview" className="hover:text-gray-900 dark:hover:text-gray-100">
              Interview Coach
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {email && <span className="hidden text-gray-500 sm:inline">{email}</span>}
          <button onClick={signOut} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
