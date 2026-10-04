import { FormEvent, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BACKEND_URL } from "../config";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { CONTENT_TYPES, detectType, getContentType, parseUrl } from "../contentTypes";
import { authHeaders } from "../api";
import type { Folder } from "../hooks/useFolders";

interface createContentInterface {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  // Folder to pre-select when the dialog opens, e.g. the folder being viewed
  defaultFolderId?: string | null;
}

const field =
  "mt-2 w-full rounded-md border border-bark/40 bg-lichen/40 px-4 py-3 font-normal text-bark placeholder:text-bark/50 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum";

const CreateContentModel = ({ open, onClose, folders, defaultFolderId }: createContentInterface) => {
  //these refs are used to keep track of the value input in respective fields
  const titleRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // type is defined as a state variable varies with the button
  const [type, setType] = useState("youtube");
  // once the user picks a type by hand, pasting a link no longer changes it
  const [typeChosenManually, setTypeChosenManually] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [folderId, setFolderId] = useState("");

  // start from the folder being viewed each time the dialog opens
  useEffect(() => {
    if (open) setFolderId(defaultFolderId ?? "");
  }, [open, defaultFolderId]);

  const typeConfig = getContentType(type);

  function handleLinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!typeChosenManually) setType(detectType(e.target.value));
  }

  function handleClose() {
    setType("youtube");
    setTypeChosenManually(false);
    setError("");
    setSaving(false);
    onClose();
  }

  // Escape closes the dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    //this will fetch the title and the link from the ref, and send it to the backend
    const title = titleRef.current?.value.trim();
    const rawLink = linkRef.current?.value;
    const content = contentRef.current?.value;
    const contentId = uuidv4();

    if (!title) return setError("Please enter a name.");

    let link: string | undefined;
    if (typeConfig.hasLink) {
      const url = parseUrl(rawLink ?? "");
      if (!url) return setError("Please enter a valid link.");
      link = url.toString();
    } else if (!content?.trim()) {
      return setError("Please enter some text.");
    }

    setError("");
    setSaving(true);
    //axios.post("Address",{data to be sent},{headers containing authentication})
    try {
      await axios.post(
        `${BACKEND_URL}/api/v1/content`,
        {
          contentId,
          link,
          title,
          type,
          content,
          folderId: folderId || null
        },
        {
          headers: authHeaders(),
        }
      );
    } catch {
      setSaving(false);
      return setError("Could not save. Please try again.");
    }

    handleClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bark/50 p-4"
      onMouseDown={(e) => {
        // only a click on the backdrop itself closes the dialog, not a drag that ends on it
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-content-title"
        className="w-full max-w-lg rounded-lg border border-moss bg-chalk p-6 text-bark shadow-xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="add-content-title" className="font-display text-3xl tracking-tight">
            Add content
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid size-9 place-items-center rounded-md outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mt-6">
          {typeConfig.hasLink ? (
            <label className="block font-medium">
              Link
              <input
                ref={linkRef}
                type="text"
                inputMode="url"
                autoFocus
                placeholder="Paste a link"
                onChange={handleLinkChange}
                className={field}
              />
            </label>
          ) : (
            <label className="block font-medium">
              Text
              <textarea
                ref={contentRef}
                rows={5}
                autoFocus
                placeholder="Write or paste your note"
                className={`${field} resize-y`}
              />
            </label>
          )}
        </div>

        <label className="mt-5 block font-medium">
          Name
          <input ref={titleRef} type="text" placeholder="What should we call it?" className={field} />
        </label>

        <label className="mt-5 block font-medium">
          Folder
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={field}>
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mt-5">
          <legend className="font-medium">Type</legend>
          <div role="radiogroup" aria-label="Type" className="mt-2 flex flex-wrap gap-2">
            {CONTENT_TYPES.map((t) => {
              const selected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setType(t.id);
                    setTypeChosenManually(true);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-chalk ${
                    selected
                      ? "border-plum bg-plum text-chalk"
                      : "border-bark/30 hover:border-bark hover:bg-lichen/60"
                  }`}
                >
                  <t.icon className="size-4" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-5 rounded-md border border-red-800/40 bg-chalk px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-4 py-2.5 font-medium outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-plum px-6 py-2.5 font-semibold text-chalk outline-none transition-colors hover:bg-bark focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-chalk disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateContentModel;
