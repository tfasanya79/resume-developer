import type { PersonalInfo } from "../../types/cv";

export function shortenUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

export function formatLinkItem(label: string, url: string): string {
  const trimmedLabel = label.trim();
  const shortened = shortenUrl(url);
  if (!trimmedLabel) return shortened;
  if (!shortened) return trimmedLabel;
  return `${trimmedLabel}: ${shortened}`;
}

export function getLinkContactItems(personal: PersonalInfo): string[] {
  return (personal.links ?? [])
    .filter((l) => l.label.trim() || l.url.trim())
    .map((l) => formatLinkItem(l.label, l.url))
    .filter(Boolean);
}

export interface ContactLineOptions {
  includeLocation?: boolean;
  includeLinks?: boolean;
}

export function getContactItems(
  personal: PersonalInfo,
  options: ContactLineOptions = {},
): string[] {
  const { includeLocation = true, includeLinks = true } = options;
  const items: string[] = [
    personal.email,
    personal.phone,
    ...(includeLocation ? [personal.location] : []),
    ...(includeLinks ? getLinkContactItems(personal) : []),
  ];
  return items.map((s) => s.trim()).filter(Boolean);
}
