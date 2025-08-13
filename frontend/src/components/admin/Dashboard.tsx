import { Activity, Users, Database, BarChart3 } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6 pt-4">
      <h2 className="text-3xl font-bold">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-figure text-primary">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Users</div>
          <div className="stat-value">1,234</div>
          <div className="stat-desc">↗︎ 12% (30 days)</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-figure text-secondary">
            <Database className="w-8 h-8" />
          </div>
          <div className="stat-title">Database Size</div>
          <div className="stat-value">2.4 GB</div>
          <div className="stat-desc">↗︎ 5% (7 days)</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-figure text-accent">
            <Activity className="w-8 h-8" />
          </div>
          <div className="stat-title">Active Sessions</div>
          <div className="stat-value">89</div>
          <div className="stat-desc">Currently online</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-figure text-success">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="stat-title">API Requests</div>
          <div className="stat-value">12.4K</div>
          <div className="stat-desc">↗︎ 8% (24 hours)</div>
        </div>
      </div>
    </div>
  );
}
