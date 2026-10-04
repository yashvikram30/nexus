import { Link } from "react-router-dom";
import { Folder as FolderIcon } from "lucide-react";
import type { Folder } from "../../hooks/useFolders";

interface FolderTileProps {
  folder: Folder;
  selected: boolean;
  onToggleSelect: () => void;
}

export default function FolderTile({ folder, selected, onToggleSelect }: FolderTileProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-chalk p-4 transition-colors ${
        selected ? "border-plum ring-1 ring-plum" : "border-moss"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`Select folder ${folder.name}`}
        className="size-5 shrink-0 cursor-pointer accent-plum"
      />
      <Link
        to={`/dashboard/folder/${folder.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded outline-none focus-visible:ring-2 focus-visible:ring-plum"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lichen" aria-hidden>
          <FolderIcon className="size-[18px]" strokeWidth={1.6} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{folder.name}</span>
          <span className="block text-sm text-bark/70">
            {folder.count} {folder.count === 1 ? "item" : "items"}
          </span>
        </span>
      </Link>
    </div>
  );
}
