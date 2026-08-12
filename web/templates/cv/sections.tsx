import type { CvProfile } from "@/types/cv";

export type SectionStyle = "modern" | "ats" | "sidebar" | "compact";

const SECTION_TITLES: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  courses: "Courses & Training",
  projects: "Projects",
  languages: "Languages",
};

export function getOrderedContentSections(profile: CvProfile): string[] {
  return profile.section_order.filter(
    (s) => s !== "personal" && s !== "improve" && s !== "order",
  );
}

function joinMeta(parts: (string | undefined | null)[], separator = " · "): string {
  return parts.filter((p) => p && p.trim()).join(separator);
}

interface SectionProps {
  profile: CvProfile;
  sectionId: string;
  style?: SectionStyle;
  accentClass?: string;
}

export function CvSectionBlock({
  profile,
  sectionId,
  style = "modern",
  accentClass = "text-blue-700",
}: SectionProps) {
  const titleClass =
    style === "ats"
      ? "mt-4 border-b border-black text-sm font-bold uppercase"
      : `mb-2 text-sm font-bold uppercase tracking-wider ${accentClass}`;

  const pillClass =
    style === "ats"
      ? ""
      : `inline-block rounded-full border px-2.5 py-0.5 text-xs ${accentClass} border-current/20 bg-current/5`;

  switch (sectionId) {
    case "experience":
      if (profile.experience.length === 0) return null;
      return (
        <section className="mt-6 cv-section" data-section="experience">
          <h2 className={style === "ats" ? titleClass : `mb-3 ${titleClass}`}>
            {SECTION_TITLES.experience}
          </h2>
          {profile.experience.map((exp) => (
            <div key={exp.id} className="mb-4 break-inside-avoid">
              <div className="flex justify-between gap-4">
                <h3 className="font-semibold">{exp.title}</h3>
                <span className="shrink-0 text-sm text-gray-500">
                  {exp.start_date} – {exp.current ? "Present" : exp.end_date}
                </span>
              </div>
              <p className="text-sm text-gray-600">{exp.company}</p>
              {style === "ats" ? (
                exp.bullets.filter(Boolean).map((b, i) => (
                  <p key={i} className="text-sm">
                    - {b}
                  </p>
                ))
              ) : (
                <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      );

    case "education":
      if (profile.education.length === 0) return null;
      return (
        <section className="mt-6 cv-section" data-section="education">
          <h2 className={style === "ats" ? titleClass : `mb-3 ${titleClass}`}>
            {SECTION_TITLES.education}
          </h2>
          {profile.education.map((edu) => (
            <div key={edu.id} className="mb-2 break-inside-avoid">
              {style === "ats" ? (
                <p className="text-sm">
                  {edu.degree}, {edu.field} - {edu.institution} ({edu.end_date})
                </p>
              ) : (
                <>
                  <h3 className="font-semibold">
                    {edu.degree}
                    {edu.field ? ` in ${edu.field}` : ""}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {joinMeta([edu.institution, edu.end_date])}
                  </p>
                </>
              )}
            </div>
          ))}
        </section>
      );

    case "skills":
      if (profile.skills.length === 0) return null;
      return (
        <section className="mt-6 cv-section" data-section="skills">
          <h2 className={titleClass}>{SECTION_TITLES.skills}</h2>
          {style === "ats" ? (
            <p className="mt-1 text-sm text-gray-700">{profile.skills.join(", ")}</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className={pillClass}>
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>
      );

    case "certifications":
      if (profile.certifications.length === 0) return null;
      return (
        <section className="mt-6 cv-section" data-section="certifications">
          <h2 className={titleClass}>{SECTION_TITLES.certifications}</h2>
          {style === "ats" ? (
            profile.certifications.map((c) => (
              <p key={c.id} className="text-sm text-gray-700">
                {c.name}, {c.issuer} ({c.year})
              </p>
            ))
          ) : (
            <div className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {profile.certifications.map((c) => (
                <div key={c.id} className="break-inside-avoid">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-600">{joinMeta([c.issuer, c.year])}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      );

    case "courses":
      if (!profile.courses?.length) return null;
      return (
        <section className="mt-6 cv-section" data-section="courses">
          <h2 className={titleClass}>{SECTION_TITLES.courses}</h2>
          {style === "ats" ? (
            profile.courses.map((c) => (
              <p key={c.id} className="text-sm text-gray-700">
                {c.name}, {c.provider} ({c.date}), {c.format}
              </p>
            ))
          ) : (
            <div className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {profile.courses.map((c) => (
                <div key={c.id} className="break-inside-avoid">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-600">
                    {joinMeta([c.provider, c.date, c.format])}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      );

    case "languages":
      if (profile.languages.length === 0) return null;
      return (
        <section className="mt-6 cv-section" data-section="languages">
          <h2 className={titleClass}>{SECTION_TITLES.languages}</h2>
          {style === "ats" ? (
            <p className="text-sm text-gray-700">
              {profile.languages
                .map((l) => (l.level ? `${l.language} (${l.level})` : l.language))
                .join(", ")}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {profile.languages.map((l) => (
                <span key={l.id} className="text-sm text-gray-700">
                  <span className="font-medium">{l.language}</span>
                  {l.level ? (
                    <span className="text-gray-500"> ({l.level})</span>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </section>
      );

    case "projects":
      if (profile.projects.length === 0) return null;
      return (
        <section className="mt-6 cv-section" data-section="projects">
          <h2 className={style === "ats" ? titleClass : `mb-3 ${titleClass}`}>
            {SECTION_TITLES.projects}
          </h2>
          {profile.projects.map((p) => (
            <div key={p.id} className="mb-2 break-inside-avoid">
              {style === "ats" ? (
                <p className="text-sm">
                  {p.name}: {p.description}
                </p>
              ) : (
                <>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-sm text-gray-700">{p.description}</p>
                </>
              )}
            </div>
          ))}
        </section>
      );

    default:
      return null;
  }
}

export function OrderedCvSections({
  profile,
  style = "modern",
  accentClass = "text-blue-700",
}: {
  profile: CvProfile;
  style?: SectionStyle;
  accentClass?: string;
}) {
  return (
    <>
      {getOrderedContentSections(profile).map((sectionId) => (
        <CvSectionBlock
          key={sectionId}
          profile={profile}
          sectionId={sectionId}
          style={style}
          accentClass={accentClass}
        />
      ))}
    </>
  );
}
