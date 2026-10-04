import { useEffect, useState } from "react";
import { ChevronUp, FolderInput, FolderPlus, Sparkles, X } from "lucide-react";
import type { Folder } from "../../hooks/useFolders";

interface SelectionBarProps {
  itemCount: number; // items the agent would read: loose selections plus everything in selected folders
  folderCount: number;
  looseItemCount: number; // individually selected items, the ones "Move" applies to
  folders: Folder[];
  onAsk: () => void;
  onMove: (folderId: string | null) => Promise<void>;
  onNewFolderForMove: () => void;
  onClear: () => void;
}

const menuItem =
  "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm outline-none hover:bg-lichen focus-visible:bg-lichen";

export default function SelectionBar({
  itemCount,
  folderCount,
  looseItemCount,
  folders,
  onAsk,
  onMove,
  onNewFolderForMove,
  onClear,
}: SelectionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function moveTo(folderId: string | null) {
    setMenuOpen(false);
    setError("");
    try {
      await onMove(folderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not move the items.");
    }
  }

  const parts = [
    folderCount > 0 ? `${folderCount} ${folderCount === 1 ? "folder" : "folders"}` : "",
    looseItemCount > 0 ? `${looseItemCount} ${looseItemCount === 1 ? "item" : "items"}` : "",
  ].filter(Boolean);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 md:pl-60">
      <div
        role="region"
        aria-label="Selection"
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-bark bg-bark px-4 py-3 text-chalk shadow-xl"
      >
        <p className="text-sm" aria-live="polite">
          <span className="font-semibold">{parts.join(" and ")} selected</span>
          <span className="text-chalk/70">
            {" · "}
            {itemCount} {itemCount === 1 ? "item" : "items"} to read
          </span>
        </p>

        {error && (
          <p role="alert" className="text-sm text-sodium">
            {error}
          </p>
        )}

        <div className="ml-auto flex items-center gap-2">
          {looseItemCount > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-2 rounded-md border border-chalk/40 px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-chalk/10 focus-visible:ring-2 focus-visible:ring-sodium"
              >
                <FolderInput className="size-4" aria-hidden />
                Move to
                <ChevronUp className="size-4" aria-hidden />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div
                    role="menu"
                    className="absolute bottom-full right-0 mb-2 max-h-72 w-56 overflow-y-auto rounded-md border border-moss bg-chalk p-1 text-bark shadow-xl"
                  >
                    <button type="button" role="menuitem" className={menuItem} onClick={() => moveTo(null)}>
                      <X className="size-4 shrink-0" aria-hidden />
                      No folder
                    </button>
                    {folders.map((f) => (
                      <button key={f.id} type="button" role="menuitem" className={menuItem} onClick={() => moveTo(f.id)}>
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      className={`${menuItem} border-t border-moss font-medium`}
                      onClick={() => {
                        setMenuOpen(false);
                        onNewFolderForMove();
                      }}
                    >
                      <FolderPlus className="size-4 shrink-0" aria-hidden />
                      New folder…
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onAsk}
            disabled={itemCount === 0}
            title={itemCount === 0 ? "The selected folders are empty" : undefined}
            className="inline-flex items-center gap-2 rounded-md bg-sodium px-4 py-2 text-sm font-semibold text-bark outline-none transition-colors hover:bg-chalk focus-visible:ring-2 focus-visible:ring-chalk disabled:opacity-50"
          >
            <Sparkles className="size-4" aria-hidden />
            Ask agent
          </button>

          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="grid size-9 place-items-center rounded-md outline-none transition-colors hover:bg-chalk/10 focus-visible:ring-2 focus-visible:ring-sodium"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
