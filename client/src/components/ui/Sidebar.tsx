import { NavLink, Link, useNavigate } from "react-router-dom";
import { Folder as FolderIcon, FolderPlus, LayoutGrid, LogOut, type LucideIcon } from "lucide-react";
import { CONTENT_TYPES } from "../../contentTypes";
import type { Folder } from "../../hooks/useFolders";

interface SidebarProps {
  // Mobile drawer state. On md+ screens the sidebar is always visible.
  open: boolean;
  onClose: () => void;
  // Number of saved items per content type id, shown beside each source
  counts: Record<string, number>;
  total: number;
  folders: Folder[];
  onNewFolder: () => void;
}

const itemBase =
  "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-plum";

function NavItem({
  to,
  icon: Icon,
  label,
  count,
  end,
  onNavigate,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  count: number;
  end?: boolean;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${itemBase} ${isActive ? "bg-lichen font-semibold" : "hover:bg-lichen/60"}`
      }
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && <span className="text-sm tabular-nums text-bark/60">{count}</span>}
    </NavLink>
  );
}

const Sidebar = ({ open, onClose, counts, total, folders, onNewFolder }: SidebarProps) => {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-bark/40 md:hidden" onClick={onClose} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-moss bg-chalk transition-transform duration-200 ease-out md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Dashboard navigation"
      >
        <div className="px-5 py-5">
          <Link to="/" className="rounded font-display text-2xl outline-none focus-visible:ring-2 focus-visible:ring-plum">
            Nexus
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <NavItem to="/dashboard" end icon={LayoutGrid} label="All saved" count={total} onNavigate={onClose} />

          <div className="mb-1 mt-6 flex items-center justify-between px-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-bark/60">Folders</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNewFolder();
              }}
              aria-label="New folder"
              className="-mr-1 grid size-7 place-items-center rounded outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
            >
              <FolderPlus className="size-4" aria-hidden />
            </button>
          </div>
          {folders.length === 0 ? (
            <p className="px-3 py-1 text-sm text-bark/60">No folders yet</p>
          ) : (
            folders.map((f) => (
              <NavItem
                key={f.id}
                to={`/dashboard/folder/${f.id}`}
                icon={FolderIcon}
                label={f.name}
                count={f.count}
                onNavigate={onClose}
              />
            ))
          )}

          <p className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-bark/60">Sources</p>
          {CONTENT_TYPES.map((t) => (
            <NavItem
              key={t.id}
              to={`/dashboard/${t.id}`}
              icon={t.icon}
              label={t.label}
              count={counts[t.id] ?? 0}
              onNavigate={onClose}
            />
          ))}
        </nav>

        <div className="border-t border-moss p-3">
          <button type="button" onClick={logout} className={`${itemBase} w-full hover:bg-lichen/60`}>
            <LogOut className="size-5 shrink-0" strokeWidth={1.6} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
