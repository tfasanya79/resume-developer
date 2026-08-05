import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCvStore } from "../state/useCvStore";
import type { JobListing, ScraperProgress } from "../types/cv";

export function JobSearchPage() {
  const { profile } = useCvStore();
  const [listings, setListings] = useState<JobListing[]>([]);
  const [progress, setProgress] = useState<ScraperProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const loadListings = async () => {
    const data = await invoke<JobListing[]>("list_job_listings");
    setListings(data);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const runScraper = async () => {
    setLoading(true);
    try {
      const res = await invoke<ScraperProgress[]>("run_job_scraper", {
        cvId: profile.id || null,
      });
      setProgress(res);
      await loadListings();
    } finally {
      setLoading(false);
    }
  };

  const saveToTracker = async (listing: JobListing) => {
    await invoke("save_application", {
      application: {
        id: "",
        title: listing.title,
        company: listing.company,
        status: "saved",
        notes: listing.description.slice(0, 500),
        created_at: "",
        updated_at: "",
      },
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Job Search</h2>
        <button
          onClick={runScraper}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Fetching..." : "Fetch Jobs (RemoteOK)"}
        </button>
      </div>

      {progress.map((p) => (
        <p key={p.source} className="mb-2 text-sm text-green-700 dark:text-green-400">
          {p.message}
        </p>
      ))}

      <div className="space-y-4">
        {listings.map((job) => (
          <div key={job.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {job.company} · {job.location}
                  {job.salary && ` · ${job.salary}`}
                </p>
                {job.match_score != null && (
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                    {job.match_score.toFixed(0)}% match
                  </span>
                )}
              </div>
              <button
                onClick={() => saveToTracker(job)}
                className="rounded-lg bg-gray-200 px-3 py-1 text-xs dark:bg-gray-700"
              >
                Save to Tracker
              </button>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
              {job.description}
            </p>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="text-center text-gray-500">No job listings yet. Click Fetch Jobs to scrape RemoteOK.</p>
        )}
      </div>
    </div>
  );
}
