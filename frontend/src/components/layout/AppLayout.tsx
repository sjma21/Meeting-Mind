import { NavLink, useLocation, Outlet } from "react-router-dom";
import {
  Mic,
  LayoutDashboard,
  Plus,
  GitBranch,
  Clock,
  Settings,
  LogOut,
} from "lucide-react";
import { useSession, useSignOut } from "../../hooks/useAuth";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meeting/new", icon: Plus, label: "New Meeting" },
  { to: "/repos", icon: GitBranch, label: "Repositories" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/meeting/new": "New Meeting",
  "/repos": "Repositories",
  "/history": "Meeting History",
  "/settings": "Settings",
};

function UserAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold">
      {initials}
    </div>
  );
}

export default function AppLayout() {
  const { session } = useSession();
  const signOut = useSignOut();
  const location = useLocation();

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.endsWith("/report") ? "Meeting Report" :
      location.pathname.startsWith("/meeting/") ? "Live Meeting" : "MeetingMind");

  const userEmail = session?.user?.email ?? "";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="fixed top-0 left-0 h-full bg-white flex flex-col"
        style={{ width: 240, borderRight: "1px solid #e5e7eb", zIndex: 10 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-base">MeetingMind</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + sign out */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <UserAvatar email={userEmail} />
            <span className="text-xs text-gray-500 truncate flex-1">{userEmail}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col" style={{ marginLeft: 240 }}>
        {/* Top header */}
        <header
          className="flex items-center justify-between px-6 py-4 bg-white"
          style={{ borderBottom: "1px solid #e5e7eb", height: 64 }}
        >
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
          <UserAvatar email={userEmail} />
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-6" style={{ background: "#f8f9fa" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
