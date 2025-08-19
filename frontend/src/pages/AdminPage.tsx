import { useState } from "react";
import {
  Users,
  Database,
  Settings,
  BarChart3,
  Menu,
  FileText,
  Shield,
  Activity,
  Languages,
} from "lucide-react";

// import Dashboard from "@/components/admin/Dashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminDatabase from "@/components/admin/AdminDatabase";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminLanguages from "@/components/admin/AdminLanguages";

export function AdminPage() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "users", label: "User Management", icon: Users },
    { id: "languages", label: "Language Management", icon: Languages },
    { id: "database", label: "Database", icon: Database },
    { id: "logs", label: "System Logs", icon: FileText },
    { id: "security", label: "Security", icon: Shield },
    { id: "monitoring", label: "Monitoring", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />;

      case "users":
        return <AdminUsers />;

      case "languages":
        return <AdminLanguages />;

      case "database":
        return <AdminDatabase />;

      case "settings":
        return <AdminSettings />;

      default:
        return (
          <div className="space-y-6 pt-4">
            <h2 className="text-3xl font-bold">
              {menuItems.find((item) => item.id === activeSection)?.label}
            </h2>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <p>Content for {activeSection} section would go here.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="drawer lg:drawer-open">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main content */}
      <div className="drawer-content flex flex-col">
        {/* Header */}
        <div className="navbar bg-base-200 pt-4 lg:hidden">
          <div className="flex-none">
            <label htmlFor="admin-drawer" className="btn btn-square btn-ghost">
              <Menu className="w-5 h-5" />
            </label>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 sm:p-6">{renderContent()}</div>
      </div>

      {/* Sidebar */}
      <div className="drawer-side">
        <label htmlFor="admin-drawer" className="drawer-overlay"></label>
        <aside className="w-70 min-h-full bg-base-200">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-left">Admin Panel</h1>
          </div>

          <ul className="menu p-6 space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.id}>
                  <a
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-3 ${
                      activeSection === item.id
                        ? "active bg-primary text-primary-content"
                        : ""
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
