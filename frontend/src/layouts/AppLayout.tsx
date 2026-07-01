import { LogOut, Users, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface text-slateText">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white md:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">CEA Assets</p>
            <p className="text-xs text-slate-500">Internal operations</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          {user?.role === "admin" ? (
            <NavItem to="/users" icon={<Users size={18} />} label="Staff accounts" />
          ) : null}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} aria-label="Sign out">
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>
        <main className="px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive ? "bg-brand-soft text-brand-dark" : "text-slate-600 hover:bg-slate-50"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
