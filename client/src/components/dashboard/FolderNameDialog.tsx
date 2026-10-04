import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";

interface FolderNameDialogProps {
  title: string;
  confirmLabel: string;
  initialName?: string;
  // Throw an Error to show its message in the dialog and keep it open
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export default function FolderNameDialog({ title, confirmLabel, initialName = "", onSubmit, onClose }: FolderNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter a folder name.");
    setError("");
    setSaving(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bark/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-dialog-title"
        className="w-full max-w-sm rounded-lg border border-moss bg-chalk p-6 text-bark shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="folder-dialog-title" className="font-display text-2xl tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid size-9 place-items-center rounded-md outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <label className="mt-5 block font-medium">
          Folder name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            placeholder="For example, Research"
            className="mt-2 w-full rounded-md border border-bark/40 bg-lichen/40 px-4 py-3 font-normal text-bark placeholder:text-bark/50 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum"
          />
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-800/40 bg-chalk px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2.5 font-medium outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-plum px-6 py-2.5 font-semibold text-chalk outline-none transition-colors hover:bg-bark focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-chalk disabled:opacity-60"
          >
            {saving ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
