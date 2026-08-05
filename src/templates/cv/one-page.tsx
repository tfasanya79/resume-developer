import type { CvProfile } from "../../types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

interface TemplateProps {
  profile: CvProfile;
  printMode?: boolean;
}

export function OnePageTemplate({ profile }: TemplateProps) {
  const compactProfile: CvProfile = {
    ...profile,
    experience: profile.experience.map((e) => ({
      ...e,
      bullets: e.bullets.filter(Boolean).slice(0, 2),
    })),
  };

  return (
    <div className="bg-white p-6 text-sm text-gray-900" style={{ minHeight: "297mm", width: "210mm" }}>
      <h1 className="text-2xl font-bold">{profile.personal.full_name || "Your Name"}</h1>
      {profile.professional_title && <p className="text-xs text-gray-600">{profile.professional_title}</p>}
      <ContactHeader
        personal={profile.personal}
        className="text-xs text-gray-500"
        includeLocation={false}
      />
      {profile.personal.summary && (
        <p className="mt-2 text-xs leading-snug">{profile.personal.summary}</p>
      )}
      <OrderedCvSections profile={compactProfile} style="compact" accentClass="text-gray-800" />
    </div>
  );
}
