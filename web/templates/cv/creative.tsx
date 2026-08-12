import type { CvProfile } from "@/types/cv";
import { ContactHeader } from "./ContactHeader";
import { OrderedCvSections } from "./sections";

interface TemplateProps {
  profile: CvProfile;
  printMode?: boolean;
}

export function CreativeTemplate({ profile, printMode }: TemplateProps) {
  const { personal, professional_title, design } = profile;
  const sidebarColor = design?.accent_color || "#4338ca";

  return (
    <div className={`flex bg-white ${printMode ? "" : ""}`} style={{ minHeight: "297mm", width: "210mm" }}>
      <div className="w-1/3 p-6 text-white" style={{ backgroundColor: sidebarColor }}>
        {design?.photo_path && (
          <img src={design.photo_path} alt="" className="mb-4 h-24 w-24 rounded-full object-cover" />
        )}
        <h1 className="text-xl font-bold">{personal.full_name || "Your Name"}</h1>
        {professional_title && <p className="mt-2 text-sm opacity-90">{professional_title}</p>}
        <ContactHeader personal={personal} className="mt-4 text-sm" layout="stack" />
        {profile.skills.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-bold uppercase">Skills</h2>
            <ul className="mt-2 text-sm">
              {profile.skills.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </>
        )}
        {profile.languages.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-bold uppercase">Languages</h2>
            <ul className="mt-2 text-sm">
              {profile.languages.map((l) => (
                <li key={l.id}>• {l.language}{l.level ? ` (${l.level})` : ""}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="w-2/3 p-6">
        {personal.summary && <p className="text-sm text-gray-700">{personal.summary}</p>}
        <OrderedCvSections
          profile={{
            ...profile,
            section_order: profile.section_order.filter(
              (s) => !["skills", "languages"].includes(s),
            ),
          }}
          style="modern"
          accentClass="text-indigo-700"
        />
      </div>
    </div>
  );
}
