import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ExternalLink, Folder as FolderIcon, Trash2 } from "lucide-react";
import { BACKEND_URL } from "../../config";
import { getContentType, hostnameOf, parseUrl } from "../../contentTypes";

interface CardProps {
  contentId: string;
  title: string;
  type: string;
  link?: string;
  content?: string;
  // Called after the item is deleted so the page can reload its list
  onDeleted: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  // Shown under the title when the item is in a folder
  folderName?: string;
}

const TEXT_PREVIEW_LENGTH = 240;

const iconButton =
  "grid size-8 place-items-center rounded-md text-bark/70 outline-none transition-colors hover:bg-lichen hover:text-bark focus-visible:ring-2 focus-visible:ring-plum";

// Handles watch?v=, youtu.be/, /shorts/ and /embed/ links, with or without extra parameters
function youtubeEmbedUrl(link?: string): string | null {
  const url = link ? parseUrl(link) : null;
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (url.searchParams.get("v")) id = url.searchParams.get("v");
  else {
    const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);
    id = m ? m[1] : null;
  }
  return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
}

type TwitterWindow = Window & { twttr?: { widgets?: { load: (el?: HTMLElement) => void } } };

const Card = ({ contentId, title, link, type, content, onDeleted, selected, onToggleSelect, folderName }: CardProps) => {
  const typeConfig = getContentType(type);
  const Icon = typeConfig.icon;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const tweetRef = useRef<HTMLDivElement>(null);

  const host = link ? hostnameOf(link) : "";
  const embedUrl = typeConfig.id === "youtube" ? youtubeEmbedUrl(link) : null;
  const isTweet = typeConfig.id === "twitter" && Boolean(link);
  const isText = typeConfig.id === "document";
  const showLinkPreview = Boolean(link) && !embedUrl && !isTweet && !isText;
  const longText = (content?.length ?? 0) > TEXT_PREVIEW_LENGTH;

  // widgets.js only scans the page once on load, so ask it to render tweets added later (e.g. after navigating)
  useEffect(() => {
    if (isTweet && tweetRef.current) {
      (window as TwitterWindow).twttr?.widgets?.load(tweetRef.current);
    }
  }, [isTweet, link]);

  async function deleteContent() {
    setDeleting(true);
    setDeleteError("");
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/content/${contentId}`, {
        // axios delete requires data property for body
        headers: {
          Authorization: localStorage.getItem("token"),
        },
      });
      onDeleted();
    } catch {
      setDeleteError("Could not delete. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border bg-chalk ${
        selected ? "border-plum ring-1 ring-plum" : "border-moss"
      }`}
    >
      <header className="flex items-start gap-3 p-4 pb-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${title}`}
          className="mt-2 size-5 shrink-0 cursor-pointer accent-plum"
        />
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lichen" aria-hidden>
          <Icon className="size-[18px]" strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold" title={title}>
            {title}
          </h3>
          <p className="flex items-center gap-1.5 truncate text-sm text-bark/70">
            <span className="truncate">
              {typeConfig.label}
              {host && typeConfig.id === "link" ? ` · ${host}` : ""}
            </span>
            {folderName && (
              <span className="inline-flex min-w-0 shrink items-center gap-1 before:mr-0.5 before:content-['·']" title={`In folder ${folderName}`}>
                <FolderIcon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{folderName}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title}`} className={iconButton}>
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${title}`}
            className={iconButton}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="px-4 pb-4">
        {embedUrl && (
          <div className="aspect-video overflow-hidden rounded-md bg-bark">
            <iframe
              className="size-full"
              src={embedUrl}
              title={title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}

        {isTweet && (
          <div ref={tweetRef}>
            <blockquote className="twitter-tweet">
              <a
                href={link?.replace("x.com", "twitter.com")}
                className="text-sm font-semibold underline underline-offset-4"
              >
                View post on X
              </a>
            </blockquote>
          </div>
        )}

        {isText && (
          <>
            <p
              className={`whitespace-pre-wrap break-words leading-7 text-bark/90 ${
                expanded ? "" : "line-clamp-6"
              }`}
            >
              {content}
            </p>
            {longText && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-2 rounded text-sm font-semibold underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-plum"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </>
        )}

        {showLinkPreview && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border border-moss p-4 outline-none transition-colors hover:bg-lichen/50 focus-visible:ring-2 focus-visible:ring-plum"
          >
            <span className="flex items-center gap-2">
              <img
                src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                alt=""
                className="size-5 rounded"
              />
              <span className="truncate text-sm font-medium">{host}</span>
            </span>
            <span className="mt-2 block break-all text-sm text-bark/70 line-clamp-2">{link}</span>
          </a>
        )}
      </div>

      {confirming && (
        <div className="flex flex-wrap items-center gap-3 border-t border-moss bg-lichen/60 px-4 py-3">
          <p className="mr-auto text-sm font-medium" role={deleteError ? "alert" : undefined}>
            {deleteError || "Delete this item?"}
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setDeleteError("");
            }}
            disabled={deleting}
            className="rounded-md px-3 py-1.5 text-sm font-medium outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={deleteContent}
            disabled={deleting}
            className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-semibold text-chalk outline-none transition-colors hover:bg-red-900 focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </article>
  );
};

export default Card;
