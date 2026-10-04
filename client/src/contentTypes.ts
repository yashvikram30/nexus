import {
  BookOpen,
  FileText,
  Github,
  Globe,
  Linkedin,
  MessageSquare,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export interface ContentTypeConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  // Hostnames (without "www.") that auto-select this type when a link is pasted
  hosts: string[];
  // Document-style items store free text instead of a link
  hasLink: boolean;
  // Types with a rich embed in Card (everything else renders a link preview)
  embeds: boolean;
}

// To support a new site, add an entry here. The modal, sidebar, dashboards and cards all read from this list.
export const CONTENT_TYPES: ContentTypeConfig[] = [
  { id: "youtube", label: "Youtube", icon: Youtube, hosts: ["youtube.com", "youtu.be", "m.youtube.com"], hasLink: true, embeds: true },
  { id: "twitter", label: "Tweet", icon: Twitter, hosts: ["twitter.com", "x.com"], hasLink: true, embeds: true },
  { id: "medium", label: "Medium", icon: BookOpen, hosts: ["medium.com", "towardsdatascience.com"], hasLink: true, embeds: false },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, hosts: ["linkedin.com"], hasLink: true, embeds: false },
  { id: "reddit", label: "Reddit", icon: MessageSquare, hosts: ["reddit.com", "old.reddit.com", "redd.it"], hasLink: true, embeds: false },
  { id: "github", label: "GitHub", icon: Github, hosts: ["github.com", "gist.github.com"], hasLink: true, embeds: false },
  { id: "link", label: "Web link", icon: Globe, hosts: [], hasLink: true, embeds: false },
  { id: "document", label: "Text", icon: FileText, hosts: [], hasLink: false, embeds: false },
];

export function getContentType(id: string): ContentTypeConfig {
  // Unknown types (e.g. saved by an older version) fall back to a generic web link
  return CONTENT_TYPES.find((t) => t.id === id) ?? CONTENT_TYPES.find((t) => t.id === "link")!;
}

export function parseUrl(raw: string): URL | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    // Reject bare words like "hello" that parse as hostnames
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

export function hostnameOf(raw: string): string {
  return parseUrl(raw)?.hostname.replace(/^www\./, "") ?? "";
}

// Pick the content type for a pasted link; unrecognised sites become a generic web link
export function detectType(raw: string): string {
  const host = hostnameOf(raw);
  if (!host) return "link";
  const match = CONTENT_TYPES.find((t) =>
    t.hosts.some((h) => host === h || host.endsWith(`.${h}`))
  );
  // Medium publications also live on subdomains such as foo.medium.com, covered by the endsWith check above
  return match?.id ?? "link";
}
