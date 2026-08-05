import { NavLink } from "react-router-dom";
import {
  FileText,
  Briefcase,
  Settings,
  Search,
  Brain,
  MessageSquare,
  Linkedin,
  DollarSign,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { useSettingsStore } from "../state/useSettingsStore";

const navItems = [
  { to: "/", label: "CV Builder", icon: FileText },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/job-match", label: "Job Match", icon: Search },
  { to: "/job-search", label: "Job Search", icon: Globe },
  { to: "/skill-gap", label: "Skill Gap", icon: Brain },
  { to: "/interview", label: "Interview Coach", icon: MessageSquare },
  { to: "/linkedin", label: "LinkedIn", icon: Linkedin },
  { to: "/salary", label: "Salary", icon: DollarSign },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { settings, toggleTheme } = useSettingsStore();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400">
          Local CV Builder
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Private & offline
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <button
          onClick={() => toggleTheme()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {settings.theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
