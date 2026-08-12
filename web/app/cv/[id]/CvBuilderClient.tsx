"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Save, FilePlus, Trash2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CvProfile } from "@/types/cv";
import { normalizePersonal, normalizeSectionOrder } from "@/types/cv";
import { saveCv, createCv, deleteCv, createTailoredCv } from "@/lib/cvDb";
import { createApplication } from "@/lib/applicationsDb";
import { extractJobMetadata } from "@/lib/tailor";
import { exportProfileToPdf, TemplateExportError } from "@/lib/exportPdf";
import { exportProfileToDocx } from "@/lib/exportDocx";
import { formatCvFilename } from "@/lib/cvNaming";
import { applyTailorChanges } from "@/lib/tailor";
import type { TailorProposal } from "@/types/cv";

import { PersonalInfoForm } from "@/components/cv/PersonalInfoForm";
import { ExperienceEditor } from "@/components/cv/ExperienceEditor";
import { EducationEditor } from "@/components/cv/EducationEditor";
import { SkillsEditor } from "@/components/cv/SkillsEditor";
import { ProjectsEditor } from "@/components/cv/ProjectsEditor";
import { CertificationsEditor } from "@/components/cv/CertificationsEditor";
import { CoursesEditor } from "@/components/cv/CoursesEditor";
import { LanguagesEditor } from "@/components/cv/LanguagesEditor";
import { CvPreview } from "@/components/cv/CvPreview";
import { SectionOrderEditor } from "@/components/cv/SectionOrderEditor";
import { CvImprovementPanel } from "@/components/cv/CvImprovementPanel";
import { TemplatePicker } from "@/components/cv/TemplatePicker";
import { AtsSidebar } from "@/components/cv/AtsSidebar";
import { TailorReviewModal } from "@/components/cv/TailorReviewModal";

interface CvRow extends Record<string, unknown> {
  id: string;
  name: string;
  template: string;
  professional_title: string | null;
  personal: CvProfile["personal"];
  experience: CvProfile["experience"];
  education: CvProfile["education"];
  skills: string[];
  projects: CvProfile["projects"];
  certifications: CvProfile["certifications"];
  courses: CvProfile["courses"];
  languages: CvProfile["languages"];
  section_order: string[];
  design: CvProfile["design"];
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProfile(row: CvRow): CvProfile {
  return {
    id: row.id,
    name: row.name,
    template: row.template,
    section_order: normalizeSectionOrder(row.section_order ?? []),
    professional_title: row.professional_title ?? "",
    personal: normalizePersonal(row.personal),
    experience: row.experience ?? [],
    education: row.education ?? [],
    skills: row.skills ?? [],
    projects: row.projects ?? [],
    certifications: row.certifications ?? [],
    courses: row.courses ?? [],
    languages: row.languages ?? [],
    competence_notes: [],
    design: row.design ?? { accent_color: "#2563eb", font_pair: "system", photo_path: "" },
    source_filename: row.source_filename,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function CvBuilderClient({ initialRow }: { initialRow: CvRow }) {
  const router = useRouter();
  const [profile, setProfile] = useState<CvProfile>(() => rowToProfile(initialRow));
  const [jobText, setJobText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [message, setMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showJobBox, setShowJobBox] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [tailorProposal, setTailorProposal] = useState<TailorProposal | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [isApplyingTailor, setIsApplyingTailor] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const skipNextAutosave = useRef(true);

  const updateProfile = (patch: Partial<CvProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    try {
      const saved = await saveCv(profile);
      setProfile(saved);
      setDirty(false);
      setMessage("CV saved successfully");
    } catch (e) {
      setMessage(String(e));
    }
  }, [profile]);

  // Debounced autosave, skipping the very first mount.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (!dirty || !profile.personal.full_name) return;
    const t = setTimeout(() => {
      void handleSave();
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showFormatMenu && !(e.target as Element).closest(".export-dropdown")) {
        setShowFormatMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFormatMenu]);

  const handleNewCv = async () => {
    try {
      const cv = await createCv();
      router.push(`/cv/${cv.id}`);
    } catch (e) {
      setMessage(String(e));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this CV? This cannot be undone.")) return;
    await deleteCv(profile.id);
    router.push("/dashboard");
  };

  const handleTailorToJob = async () => {
    if (!jobText.trim()) return;
    try {
      setIsTailoring(true);
      setMessage("");
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jobDescription: jobText }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Tailoring failed");
      const proposal: TailorProposal = await res.json();
      setTailorProposal(proposal);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setIsTailoring(false);
    }
  };

  const handleApplyTailor = async (selectedIds: string[]) => {
    if (!tailorProposal) return;
    try {
      setIsApplyingTailor(true);
      const tailored = applyTailorChanges(profile, tailorProposal.changes, selectedIds);
      const saved = await createTailoredCv(tailored);
      setTailorProposal(null);
      router.push(`/cv/${saved.id}`);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setIsApplyingTailor(false);
    }
  };

  const handleTrackApplication = async () => {
    if (!jobText.trim()) return;
    try {
      setIsTracking(true);
      const { company, role } = extractJobMetadata(jobText);
      await createApplication({
        company: company || "Unknown Company",
        position: role || "Unknown Role",
        job_description: jobText,
        cv_id: profile.id || null,
        status: "wishlist",
      });
      router.push("/applications");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setIsTracking(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await exportProfileToPdf(profile);
      setMessage("Opened print dialog — choose 'Save as PDF' to export the styled CV.");
      setExportError(null);
    } catch (e) {
      const msg = e instanceof TemplateExportError ? e.message : String(e);
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      await exportProfileToDocx(profile);
      setMessage("DOCX exported successfully");
      setExportError(null);
    } catch (e) {
      setExportError(String(e));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => (exportFormat === "pdf" ? handleExportPdf() : handleExportDocx());

  const sectionContent: Record<string, React.ReactNode> = {
    personal: (
      <PersonalInfoForm
        data={profile.personal}
        professionalTitle={profile.professional_title}
        design={profile.design}
        onChange={(personal) => updateProfile({ personal })}
        onTitleChange={(professional_title) => updateProfile({ professional_title })}
        onDesignChange={(design) => updateProfile({ design })}
      />
    ),
    experience: (
      <ExperienceEditor items={profile.experience} onChange={(experience) => updateProfile({ experience })} />
    ),
    education: (
      <EducationEditor items={profile.education} onChange={(education) => updateProfile({ education })} />
    ),
    skills: <SkillsEditor skills={profile.skills} onChange={(skills) => updateProfile({ skills })} />,
    certifications: (
      <CertificationsEditor
        items={profile.certifications}
        onChange={(certifications) => updateProfile({ certifications })}
      />
    ),
    courses: <CoursesEditor items={profile.courses ?? []} onChange={(courses) => updateProfile({ courses })} />,
    projects: <ProjectsEditor items={profile.projects} onChange={(projects) => updateProfile({ projects })} />,
    languages: (
      <LanguagesEditor items={profile.languages} onChange={(languages) => updateProfile({ languages })} />
    ),
    improve: <CvImprovementPanel profile={profile} onApply={updateProfile} />,
    order: (
      <SectionOrderEditor order={profile.section_order} onChange={(section_order) => updateProfile({ section_order })} />
    ),
    templates: <TemplatePicker value={profile.template} onChange={(template) => updateProfile({ template })} />,
  };

  const tabs = [...profile.section_order, "improve", "order", "templates"];

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex w-full flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700 lg:w-1/2">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-4 dark:border-gray-700">
          <input
            value={profile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-600"
          >
            {profile.template.replace(/-/g, " ")}
          </button>
          {dirty && <span className="text-xs text-amber-600">Unsaved</span>}
          <button onClick={handleNewCv} className="rounded-lg bg-gray-200 p-2 dark:bg-gray-700" title="New CV">
            <FilePlus size={16} />
          </button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 p-2 text-white" title="Save">
            <Save size={16} />
          </button>

          <div className="export-dropdown relative">
            <div className="flex">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1 rounded-l-lg bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Download size={14} />
                {isExporting ? "Exporting..." : exportFormat.toUpperCase()}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFormatMenu(!showFormatMenu);
                }}
                className="rounded-r-lg border-l border-green-500 bg-green-600 px-2 py-2 text-white hover:bg-green-700"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            {showFormatMenu && (
              <div className="absolute top-full z-10 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={() => {
                    setExportFormat("pdf");
                    setShowFormatMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  PDF Format
                </button>
                <button
                  onClick={() => {
                    setExportFormat("docx");
                    setShowFormatMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  DOCX Format
                </button>
              </div>
            )}
          </div>
          <button onClick={handleDelete} className="rounded-lg bg-red-100 p-2 text-red-600 dark:bg-red-900/30" title="Delete CV">
            <Trash2 size={16} />
          </button>
        </div>

        {showTemplates && (
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <TemplatePicker
              value={profile.template}
              onChange={(t) => {
                updateProfile({ template: t });
                setShowTemplates(false);
              }}
            />
          </div>
        )}

        <div className="border-b border-gray-200 p-2 dark:border-gray-700">
          <button
            onClick={() => setShowJobBox(!showJobBox)}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {showJobBox ? "Hide" : "Add"} job description for ATS matching
          </button>
          {showJobBox && (
            <>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste a job description to score your CV against it…"
                className="mt-2 h-24 w-full rounded-lg border border-gray-300 p-2 text-xs dark:border-gray-600 dark:bg-gray-800"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={handleTailorToJob}
                  disabled={!jobText.trim() || isTailoring}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isTailoring ? "Tailoring…" : "Tailor CV to This Job"}
                </button>
                <button
                  onClick={handleTrackApplication}
                  disabled={!jobText.trim() || isTracking}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isTracking ? "Adding…" : "Track This Application"}
                </button>
                <a
                  href={`/interview?cvId=${profile.id}`}
                  className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                >
                  Practice Interview
                </a>
              </div>
            </>
          )}
        </div>

        {message && (
          <div className="bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            {message}
          </div>
        )}
        {exportError && (
          <div className="bg-red-50 px-4 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {exportError}
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 p-2 dark:border-gray-700">
          {tabs.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm capitalize ${
                activeSection === section
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400"
              }`}
            >
              {section === "order"
                ? "Section Order"
                : section === "improve"
                  ? "Improve CV"
                  : section === "templates"
                    ? "Templates"
                    : section === "courses"
                      ? "Courses & Training"
                      : section}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">{sectionContent[activeSection]}</div>
      </div>

      <div className="relative flex w-full flex-1 flex-col overflow-auto lg:w-1/2 lg:flex-row">
        <div className="flex-1">
          <CvPreview profile={profile} />
        </div>
        <div className="w-full lg:w-64">
          <AtsSidebar profile={profile} jobText={jobText || undefined} onApply={updateProfile} />
        </div>
      </div>

      {tailorProposal && (
        <TailorReviewModal
          proposal={tailorProposal}
          isApplying={isApplyingTailor}
          onApply={handleApplyTailor}
          onCancel={() => setTailorProposal(null)}
        />
      )}
    </div>
  );
}
