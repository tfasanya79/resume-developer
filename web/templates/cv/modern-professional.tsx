import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

interface TemplateProps {
  profile: CvProfile;
  printMode?: boolean;
}

export function ModernProfessionalTemplate({ profile, printMode }: TemplateProps) {
  const { personal, professional_title, design } = profile;
  const accent = design?.accent_color ? { color: design.accent_color } : undefined;
  const accentClass = design?.accent_color ? "" : "text-blue-700";

  return (
    <div
      className={`bg-white p-8 text-gray-900 ${printMode ? "" : "shadow-lg"}`}
      style={{ minHeight: "297mm", width: "210mm" }}
    >
      <header className="border-b-2 pb-4 break-inside-avoid" style={{ borderColor: design?.accent_color || "#1d4ed8" }}>
        <div className="flex items-start gap-4">
          {design?.photo_path && (
            <img
              src={design.photo_path}
              alt=""
              className="h-20 w-20 rounded-full object-cover"
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={accent ?? { color: "#1e40af" }}>
              {personal.full_name || "Your Name"}
            </h1>
            {professional_title && (
              <p className="mt-1 text-sm font-medium text-gray-700">{professional_title}</p>
            )}
            <ContactHeader personal={personal} className="mt-1 text-sm text-gray-600" />
            {personal.summary && (
              <p className="mt-3 text-sm leading-relaxed text-gray-700">{personal.summary}</p>
            )}
          </div>
        </div>
      </header>
      <OrderedCvSections profile={profile} style="modern" accentClass={accentClass} />
    </div>
  );
}
