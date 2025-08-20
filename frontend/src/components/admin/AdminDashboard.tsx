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
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
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
                  {dashboardStats.tasks_processed_today.count}
                </p>
              </div>
              <div className="bg-warning/10 p-3 rounded-full">
                <BarChart3 className="w-8 h-8 text-warning" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <HardDrive className="w-4 h-4 text-info" />
              <span className="text-sm text-base-content/60">
                {dashboardStats.tasks_processed_today.size_display} processed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Processing Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Today's Task Breakdown */}
        <div className="lg:col-span-2 card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Today's Task Processing
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Completed Tasks */}
              <div className="text-center p-4 bg-success/10 rounded-lg border border-success/20">
                <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" />
                <div className="text-2xl font-bold text-success">
                  {dashboardStats.tasks_processed_today.completed}
                </div>
                <div className="text-xs text-success font-medium">
                  Completed
                </div>
              </div>

              {/* Processing Tasks */}
              <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                <Play className="w-6 h-6 text-info mx-auto mb-2" />
                <div className="text-2xl font-bold text-info">
                  {dashboardStats.tasks_processed_today.processing}
                </div>
                <div className="text-xs text-info font-medium">Processing</div>
              </div>

              {/* Pending Tasks */}
              <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
                <Clock className="w-6 h-6 text-warning mx-auto mb-2" />
                <div className="text-2xl font-bold text-warning">
                  {dashboardStats.tasks_processed_today.pending}
                </div>
                <div className="text-xs text-warning font-medium">Pending</div>
              </div>

              {/* Failed Tasks */}
              <div className="text-center p-4 bg-error/10 rounded-lg border border-error/20">
                <AlertTriangle className="w-6 h-6 text-error mx-auto mb-2" />
                <div className="text-2xl font-bold text-error">
                  {dashboardStats.tasks_processed_today.failed}
                </div>
                <div className="text-xs text-error font-medium">Failed</div>
              </div>
            </div>

            {/* Success Rate and Summary */}
            <div className="border-t border-base-200 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-base-content/60">
                    Success Rate
                  </div>
                  <div className="text-xl font-bold text-success">
                    {dashboardStats.tasks_processed_today.count > 0
                      ? Math.round(
                          (dashboardStats.tasks_processed_today.completed /
                            dashboardStats.tasks_processed_today.count) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-base-content/60">
                    Data Processed
                  </div>
                  <div className="text-xl font-bold text-info">
                    {dashboardStats.tasks_processed_today.size_display}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Overview
            </h3>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-base-content/60 mb-1">
                  Total Tasks (All Time)
                </div>
                <div className="text-2xl font-bold text-primary">
                  {dashboardStats.additional_stats.total_tasks_all_time.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-sm text-base-content/60 mb-1">
                  New Users Today
                </div>
                <div className="text-2xl font-bold text-success">
                  {dashboardStats.additional_stats.new_users_today}
                </div>
              </div>

              <div>
                <div className="text-sm text-base-content/60 mb-1">
                  Active Users Now
                </div>
                <div className="text-2xl font-bold text-info">
                  {dashboardStats.currently_logged_in}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Task Processing Health */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Processing Status</h4>
              {dashboardStats.tasks_processed_today.processing > 0 ? (
                <div className="badge badge-info badge-sm">Active</div>
              ) : (
                <div className="badge badge-ghost badge-sm">Idle</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Queue Length</span>
                <span className="font-medium">
                  {dashboardStats.tasks_processed_today.pending}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Processing</span>
                <span className="font-medium">
                  {dashboardStats.tasks_processed_today.processing}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Status */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Storage Usage</h4>
              <HardDrive className="w-4 h-4 text-info" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Total Files</span>
                <span className="font-medium">
                  {dashboardStats.total_file_size.display}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Today's Data</span>
                <span className="font-medium">
                  {dashboardStats.tasks_processed_today.size_display}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">User Activity</h4>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Total Users</span>
                <span className="font-medium">
                  {dashboardStats.total_users.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>New Today</span>
                <span className="font-medium">
                  {dashboardStats.additional_stats.new_users_today}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="card bg-base-100 shadow-lg border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Performance</h4>
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Success Rate</span>
                <span className="font-medium">
                  {dashboardStats.tasks_processed_today.count > 0
                    ? Math.round(
                        (dashboardStats.tasks_processed_today.completed /
                          dashboardStats.tasks_processed_today.count) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Tasks/MB Ratio</span>
                <span className="font-medium">
                  {dashboardStats.tasks_processed_today.size_mb > 0
                    ? (
                        dashboardStats.tasks_processed_today.count /
                        dashboardStats.tasks_processed_today.size_mb
                      ).toFixed(1)
                    : "0"}{" "}
                  tasks/MB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
