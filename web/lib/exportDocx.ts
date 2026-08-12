import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import type { CvProfile } from '@/types/cv';
import { formatCvFilename } from '@/lib/cvNaming';

// Helper to get ordered sections (matching template behavior)
function getOrderedContentSections(profile: CvProfile): string[] {
  return profile.section_order.filter(
    (s) => s !== 'personal' && s !== 'improve' && s !== 'order' && s !== 'templates'
  );
}

export async function exportProfileToDocx(profile: CvProfile): Promise<void> {
  const sections: Paragraph[] = [];

  // Header with name and professional title
  sections.push(
    new Paragraph({
      text: profile.personal.full_name || 'Untitled CV',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Professional title (if present)
  if (profile.professional_title) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: profile.professional_title, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
      })
    );
  }

  // Contact Information - formatted in a clean line
  const contactParts: string[] = [];
  if (profile.personal.email) contactParts.push(profile.personal.email);
  if (profile.personal.phone) contactParts.push(profile.personal.phone);
  if (profile.personal.location) contactParts.push(profile.personal.location);

  if (contactParts.length > 0) {
    sections.push(
      new Paragraph({
        text: contactParts.join(' • '),
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );
  }

  // Links (LinkedIn, GitHub, Portfolio, Website, and custom links)
  const linkParts: string[] = [];

  // Add legacy links if they exist
  if (profile.personal.linkedin) linkParts.push(`LinkedIn: ${profile.personal.linkedin}`);
  if (profile.personal.website) linkParts.push(`Website: ${profile.personal.website}`);

  // Add new links array
  if (profile.personal.links && profile.personal.links.length > 0) {
    profile.personal.links.forEach(link => {
      linkParts.push(`${link.label}: ${link.url}`);
    });
  }

  if (linkParts.length > 0) {
    sections.push(
      new Paragraph({
        text: linkParts.join(' • '),
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );
  }

  // Professional Summary
  if (profile.personal.summary) {
    sections.push(
      new Paragraph({
        text: 'PROFESSIONAL SUMMARY',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        border: {
          bottom: {
            color: '2563EB',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 10,
          },
        },
      }),
      new Paragraph({
        text: profile.personal.summary,
        spacing: { after: 300 },
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  }

  // Render sections in the order specified by section_order
  const orderedSections = getOrderedContentSections(profile);

  orderedSections.forEach((sectionId) => {
    switch (sectionId) {
      case 'experience':
        if (profile.experience && profile.experience.length > 0) {
          sections.push(
            new Paragraph({
              text: 'EXPERIENCE',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          profile.experience.forEach((exp, idx) => {
            // Job title and dates on same line
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: exp.title, bold: true, size: 24 }),
                ],
                spacing: { before: idx > 0 ? 200 : 100 },
              })
            );

            // Company and location
            const companyLocation = exp.location ? `${exp.company} • ${exp.location}` : exp.company;
            sections.push(
              new Paragraph({
                children: [new TextRun({ text: companyLocation, italics: true })],
              })
            );

            // Dates
            const dates = `${exp.start_date} – ${exp.current ? 'Present' : exp.end_date}`;
            sections.push(
              new Paragraph({
                children: [new TextRun({ text: dates, italics: true })],
                spacing: { after: 100 },
              })
            );

            // Bullets
            if (exp.bullets && exp.bullets.length > 0) {
              exp.bullets.filter(Boolean).forEach((bullet) => {
                sections.push(
                  new Paragraph({
                    text: bullet,
                    bullet: { level: 0 },
                    indent: { left: 720 },
                    spacing: { after: 50 },
                  })
                );
              });
            }
          });
        }
        break;

      case 'education':
        if (profile.education && profile.education.length > 0) {
          sections.push(
            new Paragraph({
              text: 'EDUCATION',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          profile.education.forEach((edu, idx) => {
            const degreeField = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
            sections.push(
              new Paragraph({
                children: [new TextRun({ text: degreeField, bold: true })],
                spacing: { before: idx > 0 ? 150 : 100 },
              })
            );

            sections.push(
              new Paragraph({
                children: [new TextRun({ text: edu.institution, italics: true })],
              })
            );

            const dates = `${edu.start_date}${edu.end_date ? ` – ${edu.end_date}` : ''}`;
            sections.push(
              new Paragraph({
                children: [new TextRun({ text: dates, italics: true })],
              })
            );

            if (edu.details) {
              sections.push(
                new Paragraph({
                  text: edu.details,
                  spacing: { before: 50 },
                })
              );
            }
          });
        }
        break;

      case 'skills':
        if (profile.skills && profile.skills.length > 0) {
          sections.push(
            new Paragraph({
              text: 'SKILLS',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          sections.push(
            new Paragraph({
              text: profile.skills.join(' • '),
              spacing: { after: 100 },
            })
          );
        }
        break;

      case 'projects':
        if (profile.projects && profile.projects.length > 0) {
          sections.push(
            new Paragraph({
              text: 'PROJECTS',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          profile.projects.forEach((proj, idx) => {
            sections.push(
              new Paragraph({
                children: [new TextRun({ text: proj.name, bold: true })],
                spacing: { before: idx > 0 ? 150 : 100 },
              })
            );

            if (proj.description) {
              sections.push(
                new Paragraph({
                  text: proj.description,
                  spacing: { after: 50 },
                })
              );
            }

            if (proj.technologies && proj.technologies.length > 0) {
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Technologies: ', italics: true }),
                    new TextRun({ text: proj.technologies.join(', ') }),
                  ],
                })
              );
            }

            if (proj.url) {
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: 'URL: ', italics: true }),
                    new TextRun({ text: proj.url }),
                  ],
                })
              );
            }
          });
        }
        break;

      case 'certifications':
        if (profile.certifications && profile.certifications.length > 0) {
          sections.push(
            new Paragraph({
              text: 'CERTIFICATIONS',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          profile.certifications.forEach((cert) => {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: cert.name, bold: true }),
                  new TextRun({ text: ` – ${cert.issuer}` }),
                  cert.year ? new TextRun({ text: ` (${cert.year})`, italics: true }) : new TextRun({ text: '' }),
                ],
                spacing: { after: 50 },
              })
            );
          });
        }
        break;

      case 'courses':
        if (profile.courses && profile.courses.length > 0) {
          sections.push(
            new Paragraph({
              text: 'COURSES & TRAINING',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          profile.courses.forEach((course) => {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: course.name, bold: true }),
                  new TextRun({ text: ` – ${course.provider}` }),
                  course.date ? new TextRun({ text: ` (${course.date})`, italics: true }) : new TextRun({ text: '' }),
                  course.format ? new TextRun({ text: ` • ${course.format}` }) : new TextRun({ text: '' }),
                ],
                spacing: { after: 50 },
              })
            );
          });
        }
        break;

      case 'languages':
        if (profile.languages && profile.languages.length > 0) {
          sections.push(
            new Paragraph({
              text: 'LANGUAGES',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              border: {
                bottom: {
                  color: '2563EB',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 10,
                },
              },
            })
          );

          const langText = profile.languages
            .map((lang) => (lang.level ? `${lang.language} (${lang.level})` : lang.language))
            .join(' • ');

          sections.push(
            new Paragraph({
              text: langText,
            })
          );
        }
        break;
    }
  });

  // Create document with proper styling
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const filename = formatCvFilename(profile.personal.full_name || profile.name).replace('.pdf', '.docx');
  saveAs(blob, filename);
}
