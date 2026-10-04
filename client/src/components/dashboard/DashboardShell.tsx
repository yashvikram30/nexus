import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../ui/Sidebar";
import type { Folder } from "../../hooks/useFolders";

interface DashboardShellProps {
  counts: Record<string, number>;
  total: number;
  folders: Folder[];
  onNewFolder: () => void;
  children: ReactNode;
}

// Sidebar plus a mobile top bar around a dashboard page
export default function DashboardShell({ counts, total, folders, onNewFolder, children }: DashboardShellProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-lichen font-body text-bark">
      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        counts={counts}
        total={total}
        folders={folders}
        onNewFolder={onNewFolder}
      />

      <div className="md:pl-60">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-moss bg-chalk px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <Link to="/" className="rounded font-display text-xl outline-none focus-visible:ring-2 focus-visible:ring-plum">
            Nexus
          </Link>
        </div>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-8 md:pt-10">{children}</main>
      </div>
    </div>
  );
}
