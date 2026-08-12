"use client";

import { useState } from "react";
import { Search, Loader2, ExternalLink, PlusCircle, Check } from "lucide-react";
import type { CvSummary, JobListing } from "@/types/cv";
import { loadCv } from "@/lib/cvDb";
import { computeMatch } from "@/lib/ats";
import { createApplication } from "@/lib/applicationsDb";

function scoreColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-gray-500";
}

export function JobSearchClient({ cvs }: { cvs: CvSummary[] }) {
  const [query, setQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [useRemoteOk, setUseRemoteOk] = useState(true);
  const [useArbeitnow, setUseArbeitnow] = useState(true);
  const [cvId, setCvId] = useState("");
  const [listings, setListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Record<string, boolean>>({});
  const [tracking, setTracking] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const sources = [useRemoteOk && "remoteok", useArbeitnow && "arbeitnow"].filter(Boolean).join(",");
    if (!sources) {
      setError("Select at least one source.");
      return;
    }
    setLoading(true);
    setError("");
    setTracked({});
    try {
      const params = new URLSearchParams({ remoteOnly: String(remoteOnly), sources });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || "Search failed");
      const data = await res.json();
      let results: JobListing[] = data.listings ?? [];

      if (cvId) {
        const profile = await loadCv(cvId);
        results = results.map((l) => ({
          ...l,
          match_score: Math.round(computeMatch(profile, l.description).score),
        }));
        results.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
      }

      setListings(results);
      setSearched(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (listing: JobListing) => {
    setTracking(listing.id);
    try {
      await createApplication({
        company: listing.company,
        position: listing.title,
        location: listing.location,
        job_url: listing.url,
        job_description: listing.description,
        salary_range: listing.salary,
        cv_id: cvId || null,
        status: "wishlist",
      });
      setTracked((prev) => ({ ...prev, [listing.id]: true }));
    } catch (e) {
      setError(String(e));
    } finally {
      setTracking(null);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Job Search</h1>
        <p className="text-sm text-gray-500">
          Live listings from RemoteOK and Arbeitnow. Pick a CV to see match scores, sorted best-first.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Keyword (e.g. backend engineer, react, product manager)…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <select
            value={cvId}
            onChange={(e) => setCvId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="">No CV (skip match score)</option>
            {cvs.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
            Remote only
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={useRemoteOk} onChange={(e) => setUseRemoteOk(e.target.checked)} />
            RemoteOK
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={useArbeitnow} onChange={(e) => setUseArbeitnow(e.target.checked)} />
            Arbeitnow
          </label>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      {searched && !loading && listings.length === 0 && !error && (
        <p className="mt-6 text-center text-sm text-gray-500">No listings matched. Try a broader keyword.</p>
      )}

      <div className="mt-6 space-y-3">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{listing.title}</p>
                <p className="text-sm text-gray-500">
                  {listing.company} · {listing.location || "Remote"}
                  {listing.salary && ` · ${listing.salary}`}
                </p>
                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                  {listing.source}
                </span>
              </div>
              {listing.match_score !== null && listing.match_score !== undefined && (
                <span className={`shrink-0 text-lg font-bold ${scoreColor(listing.match_score)}`}>
                  {listing.match_score}%
                </span>
              )}
            </div>

            <button
              onClick={() => setExpanded(expanded === listing.id ? null : listing.id)}
              className="mt-2 text-xs font-medium text-blue-600 hover:underline"
            >
              {expanded === listing.id ? "Hide description" : "Show description"}
            </button>
            {expanded === listing.id && (
              <p className="mt-2 max-h-48 overflow-auto whitespace-pre-line text-xs text-gray-600 dark:text-gray-400">
                {listing.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {listing.url && (
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <ExternalLink size={13} /> View posting
                </a>
              )}
              <button
                onClick={() => handleTrack(listing)}
                disabled={tracking === listing.id || tracked[listing.id]}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {tracked[listing.id] ? (
                  <>
                    <Check size={13} /> Tracked
                  </>
                ) : (
                  <>
                    <PlusCircle size={13} /> {tracking === listing.id ? "Adding…" : "Track This Application"}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

