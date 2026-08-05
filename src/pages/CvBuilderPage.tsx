import { useEffect, useState, useCallback, useRef } from "react";

import { invoke } from "@tauri-apps/api/core";

import { open, save } from "@tauri-apps/plugin-dialog";

import { Download, Save, FilePlus, Trash2, Upload } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useCvStore } from "../state/useCvStore";

import { useSettingsStore } from "../state/useSettingsStore";

import { PersonalInfoForm } from "../components/PersonalInfoForm";

import { ExperienceEditor } from "../components/ExperienceEditor";

import { EducationEditor } from "../components/EducationEditor";

import { SkillsEditor } from "../components/SkillsEditor";

import { ProjectsEditor } from "../components/ProjectsEditor";

import { CertificationsEditor } from "../components/CertificationsEditor";
import { CoursesEditor } from "../components/CoursesEditor";

import { LanguagesEditor } from "../components/LanguagesEditor";

import { CvPreview } from "../components/CvPreview";

import { SectionOrderEditor } from "../components/SectionOrderEditor";

import { CvImportReview } from "../components/CvImportReview";

import { CvImprovementPanel } from "../components/CvImprovementPanel";

import { TemplatePicker } from "../components/TemplatePicker";

import { AtsSidebar } from "../components/AtsSidebar";

import { OnboardingWizard } from "../components/OnboardingWizard";

import { type ImportResult, normalizePersonal, normalizeSectionOrder } from "../types/cv";

import { formatCvFilename } from "../utils/cvNaming";

import { exportProfileToPdf, openExportPreview, TemplateExportError } from "../utils/exportPdf";
import { exportProfileToDocx } from "../utils/exportDocx";
import { ExportFallbackDialog } from "../components/ExportFallbackDialog";



export function CvBuilderPage() {

  const navigate = useNavigate();

  const { settings, loaded: settingsLoaded } = useSettingsStore();

  const {

    profile,

    savedCvs,

    dirty,

    jobContext,

    updateProfile,

    setProfile,

    loadCvList,

    loadCv,

    saveCv,

    deleteCv,

    newCv,

    importCv,

  } = useCvStore();

  const [activeSection, setActiveSection] = useState("personal");

  const [message, setMessage] = useState("");

  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [showTemplates, setShowTemplates] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(

    () => !localStorage.getItem("onboarding_complete"),

  );

  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const lastExportPathRef = useRef<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [showFormatMenu, setShowFormatMenu] = useState(false);



  useEffect(() => {

    loadCvList();

  }, [loadCvList]);



  useEffect(() => {

    const handleClickOutside = (e: MouseEvent) => {

      if (showFormatMenu && !(e.target as Element).closest('.export-dropdown')) {

        setShowFormatMenu(false);

      }

    };



    document.addEventListener('click', handleClickOutside);

    return () => document.removeEventListener('click', handleClickOutside);

  }, [showFormatMenu]);



  const autosave = useCallback(async () => {

    if (!dirty || !profile.personal.full_name) return;

    try {

      await saveCv();

    } catch {

      /* ignore autosave errors */

    }

  }, [dirty, profile, saveCv]);



  useEffect(() => {

    const t = setTimeout(autosave, 2000);

    return () => clearTimeout(t);

  }, [autosave, profile]);



  const handleSave = async () => {

    try {

      await saveCv();

      setMessage("CV saved successfully");

    } catch (e) {

      setMessage(String(e));

    }

  };



  const handleImport = async () => {

    try {

      const path = await open({

        filters: [{ name: "PDF", extensions: ["pdf"] }],

        multiple: false,

      });

      if (!path || typeof path !== "string") return;

      const result = await importCv(path);

      setImportResult(result);

    } catch (e) {

      setMessage(String(e));

    }

  };



  const acceptImport = async (andTailor = false) => {

    if (!importResult) return;

    setProfile({
      ...importResult.profile,
      courses: importResult.profile.courses ?? [],
      section_order: normalizeSectionOrder(importResult.profile.section_order ?? []),
      personal: normalizePersonal(importResult.profile.personal),
    });

    setImportResult(null);

    try {

      await saveCv();

      setMessage("Imported CV saved — review and edit sections as needed");

      if (andTailor) navigate("/job-match");

    } catch (e) {

      setMessage(String(e));

    }

  };



  const handleExportPdf = async (useBasic = false, reusePath?: string | null) => {

    try {

      setIsExporting(true);

      const current = useCvStore.getState().profile;

      const defaultName = formatCvFilename(current.personal.full_name || current.name);

      if (useBasic) {

        let id = profile.id;

        if (!id) id = await saveCv();

        const path =
          reusePath ??
          (await save({

            filters: [{ name: "PDF", extensions: ["pdf"] }],

            defaultPath: defaultName,

          }));

        if (!path) return;

        lastExportPathRef.current = path;

        await invoke("export_pdf", { id, path });

        setMessage(`PDF exported (basic) as ${defaultName}`);

        setExportError(null);

        return;

      }

      await exportProfileToPdf(current);

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

      const current = useCvStore.getState().profile;

      await exportProfileToDocx(current);

      setMessage('DOCX exported successfully');

      setExportError(null);

    } catch (e) {

      setExportError(String(e));

    } finally {

      setIsExporting(false);

    }

  };



  const handleExport = async () => {

    if (exportFormat === 'pdf') {

      await handleExportPdf();

    } else {

      await handleExportDocx();

    }

  };



  const handleExportPortfolio = async () => {

    try {

      let id = profile.id;

      if (!id) id = await saveCv();

      const path = await save({

        filters: [{ name: "HTML", extensions: ["html"] }],

        defaultPath: "portfolio.html",

      });

      if (path) {

        await invoke("export_portfolio", { cvId: id, path });

        setMessage("Portfolio exported successfully");

      }

    } catch (e) {

      setMessage(String(e));

    }

  };



  const handleNewCv = () => {

    newCv(settingsLoaded ? settings.default_template : undefined);

    setMessage("New CV created");

  };



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

      <ExperienceEditor

        items={profile.experience}

        jobContext={jobContext}

        onChange={(experience) => updateProfile({ experience })}

      />

    ),

    education: (

      <EducationEditor items={profile.education} onChange={(education) => updateProfile({ education })} />

    ),

    skills: <SkillsEditor skills={profile.skills} onChange={(skills) => updateProfile({ skills })} />,

    certifications: (

      <CertificationsEditor items={profile.certifications} onChange={(certifications) => updateProfile({ certifications })} />

    ),

    courses: (

      <CoursesEditor items={profile.courses ?? []} onChange={(courses) => updateProfile({ courses })} />

    ),

    projects: (

      <ProjectsEditor items={profile.projects} onChange={(projects) => updateProfile({ projects })} />

    ),

    languages: (

      <LanguagesEditor items={profile.languages} onChange={(languages) => updateProfile({ languages })} />

    ),

    improve: <CvImprovementPanel />,

    order: (

      <SectionOrderEditor order={profile.section_order} onChange={(section_order) => updateProfile({ section_order })} />

    ),

    templates: (

      <TemplatePicker value={profile.template} onChange={(template) => updateProfile({ template })} />

    ),

  };



  const tabs = [...profile.section_order, "improve", "order", "templates"];



  return (

    <div className="flex h-full flex-col lg:flex-row">

      {showOnboarding && (

        <OnboardingWizard

          onComplete={(action, template) => {

            localStorage.setItem("onboarding_complete", "1");

            setShowOnboarding(false);

            if (action === "blank" && template) newCv(template);

            if (action === "import") handleImport();

          }}

        />

      )}



      {importResult && (

        <CvImportReview

          result={importResult}

          onAccept={() => acceptImport(false)}

          onDiscard={() => setImportResult(null)}

          onAcceptAndTailor={() => acceptImport(true)}

        />

      )}



      {exportError && (

        <ExportFallbackDialog

          error={exportError}

          busy={isExporting}

          onRetry={() => {

            void handleExportPdf(false, lastExportPathRef.current);

          }}

          onBasicExport={() => {

            void handleExportPdf(true, lastExportPathRef.current);

          }}

          onCancel={() => {

            if (!isExporting) setExportError(null);

          }}

        />

      )}



      <div className="flex w-full flex-col border-r border-gray-200 dark:border-gray-700 lg:w-1/2">

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

          <button onClick={handleImport} className="rounded-lg bg-indigo-600 p-2 text-white" title="Import PDF">

            <Upload size={16} />

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
                title={`Export ${exportFormat.toUpperCase()}`}
              >
                <Download size={14} />
                {isExporting ? 'Exporting...' : exportFormat.toUpperCase()}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFormatMenu(!showFormatMenu);
                }}
                className="rounded-r-lg bg-green-600 px-2 py-2 text-white hover:bg-green-700 border-l border-green-500"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {showFormatMenu && (
              <div className="absolute top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    setExportFormat('pdf');
                    setShowFormatMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    exportFormat === 'pdf' ? 'bg-gray-50 font-semibold' : ''
                  }`}
                >
                  PDF Format
                </button>
                <button
                  onClick={() => {
                    setExportFormat('docx');
                    setShowFormatMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                    exportFormat === 'docx' ? 'bg-gray-50 font-semibold' : ''
                  }`}
                >
                  DOCX Format
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => openExportPreview(useCvStore.getState().profile)}
            className="rounded-lg bg-green-700 px-3 py-2 text-xs text-white"
            title="Preview export layout"
          >
            Preview
          </button>

          <button onClick={handleExportPortfolio} className="rounded-lg bg-purple-600 px-3 py-2 text-xs text-white">

            Portfolio

          </button>

        </div>



        {showTemplates && (

          <div className="border-b border-gray-200 p-4 dark:border-gray-700">

            <TemplatePicker value={profile.template} onChange={(t) => { updateProfile({ template: t }); setShowTemplates(false); }} />

          </div>

        )}



        {message && (

          <div className="bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{message}</div>

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



        {savedCvs.length > 0 && (

          <div className="border-t border-gray-200 p-4 dark:border-gray-700">

            <h3 className="mb-2 text-sm font-medium">Saved CVs</h3>

            <div className="max-h-32 space-y-1 overflow-auto">

              {savedCvs.map((cv) => (

                <div key={cv.id} className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">

                  <button onClick={() => loadCv(cv.id)} className="hover:underline">{cv.name}</button>

                  <button onClick={() => deleteCv(cv.id)} className="text-red-500"><Trash2 size={14} /></button>

                </div>

              ))}

            </div>

          </div>

        )}

      </div>



      <div className="relative flex w-full flex-1 flex-col lg:w-1/2 lg:flex-row">

        <div className="flex-1">

          <CvPreview profile={profile} />

        </div>

        <div className="w-full lg:w-64">

          <AtsSidebar jobText={jobContext || undefined} />

        </div>

      </div>

    </div>

  );

}


