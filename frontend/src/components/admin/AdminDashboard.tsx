import { useEffect } from "react";
import {
  Users,
  HardDrive,
  Activity,
  XCircle,
  Loader2,
  TrendingUp,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { AdminDashboardStats } from "@/types/api";

export default function AdminDashboard() {
  const toast = useToast();

  const {
    data: dashboardStats,
    isLoading,
    error,
  } = useQuery<AdminDashboardStats>({
    queryKey: ["adminDashboard"],
    queryFn: adminAPI.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (error) {
      toast.error("Failed to load dashboard data", "Error");
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Dashboard</h2>
          <p className="text-base-content/70">
            Unable to retrieve dashboard statistics
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl leading-[1.1] text-left mb-2">
            Admin Dashboard
          </h1>
          <p className="text-base-content/70">
            System overview for {formatDate(dashboardStats.date)}
          </p>
        </div>
        <div className="text-right text-sm text-base-content/60">
          Last updated: {formatTime(dashboardStats.generated_at)}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-base-content/70">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-primary">
                  {dashboardStats.total_users.toLocaleString()}
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <UserPlus className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">
                +{dashboardStats.additional_stats.new_users_today} today
              </span>
            </div>
          </div>
        </div>

        {/* Currently Logged In */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-base-content/70">
                  Active Users
                </p>
                <p className="text-3xl font-bold text-success">
                  {dashboardStats.currently_logged_in}
                </p>
              </div>
              <div className="bg-success/10 p-3 rounded-full">
                <Activity className="w-8 h-8 text-success" />
              </div>
            </div>
            <div className="text-sm text-base-content/60 mt-3">
              Currently online
            </div>
          </div>
        </div>

        {/* Total File Size */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-base-content/70">
                  Storage Used
                </p>
                <p className="text-3xl font-bold text-info">
                  {dashboardStats.total_file_size.display}
                </p>
              </div>
              <div className="bg-info/10 p-3 rounded-full">
                <HardDrive className="w-8 h-8 text-info" />
              </div>
            </div>
            <div className="text-sm text-base-content/60 mt-3">
              {dashboardStats.total_file_size.size_mb.toLocaleString()} MB total
            </div>
          </div>
        </div>

        {/* Tasks Processed Today */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-base-content/70">
                  Tasks Today
                </p>
                <p className="text-3xl font-bold text-warning">
                  {dashboardStats.tasks_processed_today}
                </p>
              </div>
              <div className="bg-warning/10 p-3 rounded-full">
                <BarChart3 className="w-8 h-8 text-warning" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-sm text-base-content/60">
                {dashboardStats.additional_stats.total_tasks_all_time.toLocaleString()}{" "}
                all time
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Stats Summary */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Summary
            </h3>

            <div className="space-y-4">
              <div className="stat">
                <div className="stat-title text-sm">Total Tasks (All Time)</div>
                <div className="stat-value text-2xl text-primary">
                  {dashboardStats.additional_stats.total_tasks_all_time.toLocaleString()}
                </div>
              </div>

              <div className="stat">
                <div className="stat-title text-sm">New Users Today</div>
                <div className="stat-value text-2xl text-success">
                  {dashboardStats.additional_stats.new_users_today}
                </div>
              </div>

              <div className="stat">
                <div className="stat-title text-sm">Success Rate Today</div>
                <div className="stat-value text-2xl text-info">
                  {dashboardStats.tasks_processed_today > 0
                    ? Math.round(
                        (dashboardStats.additional_stats.tasks_today_by_status
                          .completed /
                          dashboardStats.tasks_processed_today) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
