import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { FolderPlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import CreateContentModel from "../components/CreateContentModel";
import DashboardShell from "../components/dashboard/DashboardShell";
import SignInRequired from "../components/dashboard/SignInRequired";
import FolderNameDialog from "../components/dashboard/FolderNameDialog";
import FolderTile from "../components/dashboard/FolderTile";
import SelectionBar from "../components/dashboard/SelectionBar";
import AgentPanel from "../components/dashboard/AgentPanel";
import Card from "../components/ui/Card";
import { useContent } from "../hooks/useContent";
import { useFolders } from "../hooks/useFolders";
import { CONTENT_TYPES, getContentType } from "../contentTypes";

const primaryButton =
  "inline-flex items-center gap-2 rounded-md bg-plum px-4 py-2.5 font-semibold text-chalk outline-none transition-colors hover:bg-bark focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-lichen";

const outlineButton =
  "inline-flex items-center gap-2 rounded-md border border-bark/40 px-4 py-2.5 font-medium outline-none transition-colors hover:bg-chalk focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-lichen";

const iconButton =
  "grid size-9 place-items-center rounded-md text-bark/70 outline-none transition-colors hover:bg-chalk hover:text-bark focus-visible:ring-2 focus-visible:ring-plum";

type Dialog =
  | { kind: "none" }
  | { kind: "new-folder" }
  | { kind: "new-folder-and-move" } // creating a folder from the "Move to" menu, then moving the selection into it
  | { kind: "rename-folder"; id: string; name: string };

function toggle(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// One page for /dashboard (everything), /dashboard/<type> (one source) and /dashboard/folder/<id> (one folder)
function Dashboard() {
  const splat = useParams()["*"] ?? "";
  const [first, second] = splat.split("/");
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [agentOpen, setAgentOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [query, setQuery] = useState("");
  // Selections live here (not per view) so they carry across folders and sources
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [pickedFolders, setPickedFolders] = useState<Set<string>>(new Set());

  // we call the refresh and contents from the useContent hook, whose work is to fetch all the data from the backend
  const { contents, loading, refresh } = useContent();
  const { folders, refresh: refreshFolders, createFolder, renameFolder, deleteFolder, moveItems } = useFolders();

  // Refresh content when modal state changes
  useEffect(() => {
    refresh();
    refreshFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const refreshAll = useCallback(() => {
    refresh();
    refreshFolders();
  }, [refresh, refreshFolders]);

  // Newest first. Items saved by older versions with an unknown type count as web links.
  const items = useMemo(
    () => [...contents].reverse().map((c) => ({ ...c, folderId: c.folderId ?? null, typeId: getContentType(c.type).id })),
    [contents]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const c of items) result[c.typeId] = (result[c.typeId] ?? 0) + 1;
    return result;
  }, [items]);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Drop selections that no longer exist (deleted items, deleted folders)
  const selectedItemIds = useMemo(
    () => items.filter((c) => pickedItems.has(c.contentId)).map((c) => c.contentId),
    [items, pickedItems]
  );
  const selectedFolderIds = useMemo(
    () => folders.filter((f) => pickedFolders.has(f.id)).map((f) => f.id),
    [folders, pickedFolders]
  );

  // Everything the agent would read: loose selections plus every item inside a selected folder
  const agentItems = useMemo(() => {
    const folderSet = new Set(selectedFolderIds);
    const itemSet = new Set(selectedItemIds);
    return items.filter((c) => itemSet.has(c.contentId) || (c.folderId !== null && folderSet.has(c.folderId)));
  }, [items, selectedItemIds, selectedFolderIds]);

  if (!localStorage.getItem("token")) return <SignInRequired />;

  const view =
    first === "folder" && second
      ? ({ kind: "folder", id: second } as const)
      : first
        ? ({ kind: "type", id: first } as const)
        : ({ kind: "all" } as const);

  if (view.kind === "type" && !CONTENT_TYPES.some((t) => t.id === view.id)) return <Navigate to="/dashboard" replace />;
  // Wait for folders to load before deciding a folder id is unknown
  if (view.kind === "folder" && folders.length > 0 && !folderById.has(view.id)) return <Navigate to="/dashboard" replace />;

  const typeConfig = view.kind === "type" ? getContentType(view.id) : null;
  const currentFolder = view.kind === "folder" ? folderById.get(view.id) ?? null : null;

  const needle = query.trim().toLowerCase();
  const inView = items.filter((c) => {
    if (view.kind === "type") return c.typeId === view.id;
    if (view.kind === "folder") return c.folderId === view.id;
    return true;
  });
  const visible = needle
    ? inView.filter((c) => [c.title, c.link, c.content].some((v) => v?.toLowerCase().includes(needle)))
    : inView;

  // Folder tiles are shown on the main view only
  const visibleFolders =
    view.kind === "all" ? folders.filter((f) => !needle || f.name.toLowerCase().includes(needle)) : [];

  const heading = currentFolder ? currentFolder.name : typeConfig ? typeConfig.label : "All saved";
  const emptyLabel = currentFolder
    ? "This folder is empty"
    : typeConfig
      ? `No ${typeConfig.label} items yet`
      : "Nothing saved yet";

  const allVisibleSelected = visible.length > 0 && visible.every((c) => pickedItems.has(c.contentId));
  const hasSelection = selectedItemIds.length > 0 || selectedFolderIds.length > 0;

  function toggleSelectAll() {
    setPickedItems((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (allVisibleSelected) next.delete(c.contentId);
        else next.add(c.contentId);
      }
      return next;
    });
  }

  function clearSelection() {
    setPickedItems(new Set());
    setPickedFolders(new Set());
  }

  async function moveSelection(folderId: string | null) {
    await moveItems(selectedItemIds, folderId);
    refresh();
    // once moved, the selection has done its job
    setPickedItems(new Set());
  }

  async function removeCurrentFolder() {
    if (!currentFolder) return;
    setFolderError("");
    try {
      await deleteFolder(currentFolder.id);
      setPickedFolders((prev) => {
        const next = new Set(prev);
        next.delete(currentFolder.id);
        return next;
      });
      setConfirmingDelete(false);
      refresh();
      navigate("/dashboard");
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : "Could not delete the folder.");
    }
  }

  return (
    <DashboardShell
      counts={counts}
      total={items.length}
      folders={folders}
      onNewFolder={() => setDialog({ kind: "new-folder" })}
    >
      <CreateContentModel
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        folders={folders}
        defaultFolderId={currentFolder?.id ?? null}
      />

      {dialog.kind === "new-folder" && (
        <FolderNameDialog
          title="New folder"
          confirmLabel="Create"
          onSubmit={async (name) => {
            await createFolder(name);
          }}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "new-folder-and-move" && (
        <FolderNameDialog
          title="New folder"
          confirmLabel="Create and move"
          onSubmit={async (name) => {
            const folder = await createFolder(name);
            await moveSelection(folder.id);
          }}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}
      {dialog.kind === "rename-folder" && (
        <FolderNameDialog
          title="Rename folder"
          confirmLabel="Save"
          initialName={dialog.name}
          onSubmit={(name) => renameFolder(dialog.id, name)}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {agentOpen && (
        <AgentPanel
          items={agentItems}
          contentIds={selectedItemIds}
          folderIds={selectedFolderIds}
          folderNames={selectedFolderIds.map((id) => folderById.get(id)?.name ?? "")}
          onClose={() => setAgentOpen(false)}
        />
      )}

      <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="min-w-0 break-words font-display text-4xl leading-tight tracking-tight sm:text-5xl">{heading}</h1>
            {currentFolder && (
              <>
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "rename-folder", id: currentFolder.id, name: currentFolder.name })}
                  aria-label="Rename folder"
                  className={`${iconButton} ml-2 shrink-0`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete folder"
                  className={`${iconButton} shrink-0`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>
          <p className="mt-1 text-bark/70" aria-live="polite">
            {loading ? "Loading…" : `${inView.length} ${inView.length === 1 ? "item" : "items"}`}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setDialog({ kind: "new-folder" })} className={outlineButton}>
            <FolderPlus className="size-4" aria-hidden />
            New folder
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className={primaryButton}>
            <Plus className="size-4" aria-hidden />
            Add content
          </button>
        </div>
      </header>

      {confirmingDelete && currentFolder && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-moss bg-chalk px-4 py-3">
          <p className="mr-auto text-sm" role={folderError ? "alert" : undefined}>
            {folderError ||
              `Delete the folder “${currentFolder.name}”? Its ${currentFolder.count} ${
                currentFolder.count === 1 ? "item stays" : "items stay"
              } in All saved.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
              setFolderError("");
            }}
            className="rounded-md px-3 py-1.5 text-sm font-medium outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={removeCurrentFolder}
            className="rounded-md bg-red-800 px-3 py-1.5 text-sm font-semibold text-chalk outline-none transition-colors hover:bg-red-900 focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:ring-offset-2"
          >
            Delete folder
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-bark/60" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              currentFolder ? `Search ${currentFolder.name}` : typeConfig ? `Search ${typeConfig.label}` : "Search everything you saved"
            }
            aria-label="Search saved items"
            className="w-full rounded-md border border-bark/40 bg-chalk py-2.5 pl-10 pr-4 text-bark outline-none transition-colors placeholder:text-bark/50 focus:border-plum focus:ring-2 focus:ring-plum"
          />
        </div>
        {visible.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="rounded font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-plum"
          >
            {allVisibleSelected ? "Deselect all" : `Select all ${visible.length}`}
          </button>
        )}
      </div>

      {visibleFolders.length > 0 && (
        <section className="mt-8" aria-label="Folders">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bark/60">Folders</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleFolders.map((f) => (
              <FolderTile
                key={f.id}
                folder={f}
                selected={pickedFolders.has(f.id)}
                onToggleSelect={() => setPickedFolders((prev) => toggle(prev, f.id))}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-label="Saved items">
        {visibleFolders.length > 0 && (
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bark/60">Items</h2>
        )}
        {loading ? (
          <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-hidden>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-56 rounded-lg border border-moss bg-chalk/70 motion-safe:animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-moss px-6 py-16 text-center">
            {needle ? (
              <>
                <h2 className="font-display text-2xl">No matches</h2>
                <p className="mx-auto mt-2 max-w-sm leading-7 text-bark/80">
                  Nothing {currentFolder ? `in ${currentFolder.name} ` : typeConfig ? `in ${typeConfig.label} ` : ""}matches “
                  {query.trim()}”.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-5 rounded font-semibold underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-plum"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl">{emptyLabel}</h2>
                <p className="mx-auto mt-2 max-w-sm leading-7 text-bark/80">
                  {currentFolder
                    ? "Add something new here, or select items elsewhere and use Move to."
                    : "Paste a link or write a note and it will show up here."}
                </p>
                <button type="button" onClick={() => setModalOpen(true)} className={`${primaryButton} mt-6`}>
                  <Plus className="size-4" aria-hidden />
                  Add content
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((c) => (
              <Card
                key={c.contentId}
                contentId={c.contentId}
                title={c.title}
                link={c.link}
                type={c.type}
                content={c.content}
                onDeleted={refreshAll}
                selected={pickedItems.has(c.contentId)}
                onToggleSelect={() => setPickedItems((prev) => toggle(prev, c.contentId))}
                folderName={view.kind === "folder" ? undefined : c.folderId ? folderById.get(c.folderId)?.name : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {hasSelection && (
        <SelectionBar
          itemCount={agentItems.length}
          folderCount={selectedFolderIds.length}
          looseItemCount={selectedItemIds.length}
          folders={folders}
          onAsk={() => setAgentOpen(true)}
          onMove={moveSelection}
          onNewFolderForMove={() => setDialog({ kind: "new-folder-and-move" })}
          onClear={clearSelection}
        />
      )}
    </DashboardShell>
  );
}

export default Dashboard;
