export function formatCvFilename(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    );
  if (parts.length === 0) return "CV_Resume.pdf";
  return `CV_${parts.join("_")}.pdf`;
}

export function parseCvFilename(
  filename: string,
): { first: string; last: string } | null {
  const stem = filename.replace(/\.pdf$/i, "");
  const withoutPrefix = stem.replace(/^CV_/i, "");
  const parts = withoutPrefix.split("_").filter(Boolean);
  if (parts.length < 2) return null;
  const cap = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return { first: cap(parts[0]), last: cap(parts[1]) };
}
