import type { LucideIcon } from "lucide-react";
import {
  Award,
  Github,
  Gitlab,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";
import type { LinkItem, PersonalInfo } from "@/types/cv";
import { formatLinkItem } from "./contactLine";

export function iconForLink(label: string, url: string): LucideIcon {
  const haystack = `${label} ${url}`.toLowerCase();
  if (haystack.includes("linkedin")) return Linkedin;
  if (haystack.includes("credly")) return Award;
  if (haystack.includes("github")) return Github;
  if (haystack.includes("gitlab")) return Gitlab;
  if (haystack.includes("twitter") || haystack.includes("x.com")) return Twitter;
  return Globe;
}

interface BasicContactItem {
  key: string;
  icon: LucideIcon;
  text: string;
}

function getBasicContactItems(
  personal: PersonalInfo,
  includeLocation: boolean,
): BasicContactItem[] {
  const items: BasicContactItem[] = [];
  if (personal.email.trim()) {
    items.push({ key: "email", icon: Mail, text: personal.email.trim() });
  }
  if (personal.phone.trim()) {
    items.push({ key: "phone", icon: Phone, text: personal.phone.trim() });
  }
  if (includeLocation && personal.location.trim()) {
    items.push({ key: "location", icon: MapPin, text: personal.location.trim() });
  }
  return items;
}

function getLinkItems(personal: PersonalInfo): LinkItem[] {
  return (personal.links ?? []).filter((l) => l.label.trim() || l.url.trim());
}

export interface ContactHeaderProps {
  personal: PersonalInfo;
  className?: string;
  separator?: string;
  includeLocation?: boolean;
  align?: "left" | "center";
  layout?: "inline" | "stack";
  iconSize?: number;
}

function ContactIcon({
  icon: Icon,
  size,
  className,
}: {
  icon: LucideIcon;
  size: number;
  className?: string;
}) {
  return (
    <Icon
      className={`shrink-0 opacity-80 ${className ?? ""}`}
      size={size}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

function BasicRow({
  items,
  separator,
  iconSize,
  centered,
}: {
  items: BasicContactItem[];
  separator: string;
  iconSize: number;
  centered: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${centered ? "justify-center" : ""}`}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <span key={item.key} className="inline-flex items-center gap-1">
            {index > 0 && (
              <span className="mr-1 opacity-50" aria-hidden>
                {separator}
              </span>
            )}
            <ContactIcon icon={Icon} size={iconSize} />
            <span>{item.text}</span>
          </span>
        );
      })}
    </div>
  );
}

function LinksBlock({
  links,
  iconSize,
  centered,
}: {
  links: LinkItem[];
  iconSize: number;
  centered: boolean;
}) {
  if (links.length === 0) return null;

  return (
    <div
      className={`mt-1 flex flex-col gap-0.5 ${centered ? "items-center" : ""}`}
    >
      {links.map((link) => {
        const Icon = iconForLink(link.label, link.url);
        const text = formatLinkItem(link.label, link.url);
        return (
          <span key={link.id} className="inline-flex items-center gap-1">
            <ContactIcon icon={Icon} size={iconSize} />
            <span>{text}</span>
          </span>
        );
      })}
    </div>
  );
}

function StackLayout({
  basicItems,
  links,
  iconSize,
  centered,
}: {
  basicItems: BasicContactItem[];
  links: LinkItem[];
  iconSize: number;
  centered: boolean;
}) {
  const rows: Array<{ key: string; icon: LucideIcon; text: string }> = [
    ...basicItems.map((item) => ({ key: item.key, icon: item.icon, text: item.text })),
    ...links.map((link) => ({
      key: link.id,
      icon: iconForLink(link.label, link.url),
      text: formatLinkItem(link.label, link.url),
    })),
  ];

  if (rows.length === 0) return null;

  return (
    <div className={`flex flex-col gap-0.5 ${centered ? "items-center" : ""}`}>
      {rows.map((row) => (
        <span key={row.key} className="inline-flex items-center gap-1">
          <ContactIcon icon={row.icon} size={iconSize} />
          <span>{row.text}</span>
        </span>
      ))}
    </div>
  );
}

export function ContactHeader({
  personal,
  className = "",
  separator = "·",
  includeLocation = true,
  align = "left",
  layout = "inline",
  iconSize = 13,
}: ContactHeaderProps) {
  const basicItems = getBasicContactItems(personal, includeLocation);
  const links = getLinkItems(personal);
  const centered = align === "center";

  if (basicItems.length === 0 && links.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {layout === "stack" ? (
        <StackLayout
          basicItems={basicItems}
          links={links}
          iconSize={iconSize}
          centered={centered}
        />
      ) : (
        <>
          <BasicRow
            items={basicItems}
            separator={separator}
            iconSize={iconSize}
            centered={centered}
          />
          <LinksBlock links={links} iconSize={iconSize} centered={centered} />
        </>
      )}
    </div>
  );
}
