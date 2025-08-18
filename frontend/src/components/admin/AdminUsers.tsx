import { useState } from "react";
import {
  Users,
  ShieldCheck,
  UserX,
  Trash2,
  CheckCircle,
  XCircle,
  Crown,
  Loader2,
  Search,
  Filter,
  UserMinus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AxiosError } from "axios";
import { adminAPI } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useAppSelector } from "@/hooks/useAppDispatch";
import type { AdminUser, UserActionRequest } from "@/types/api";

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVerified, setFilterVerified] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [filterAdmin, setFilterAdmin] = useState<"all" | "admin" | "user">(
    "all"
  );
  const [filterDeleted, setFilterDeleted] = useState<
    "all" | "active" | "deleted"
  >("all");
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: adminAPI.getUsers,
  });

  const userActionMutation = useMutation({
    mutationFn: adminAPI.performUserAction,
    onSuccess: (data) => {
      toast.success(data.message, "Action Completed");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || "Action failed", "Error");
      }
    },
  });

  const handleUserAction = async (
    email: string,
    action: UserActionRequest["action"]
  ) => {
    let confirmMessage = "";

    switch (action) {
      case "verify":
        confirmMessage = `Are you sure you want to verify the user ${email}?`;
        break;
      case "make_admin":
        confirmMessage = `Are you sure you want to grant admin privileges to ${email}?`;
        break;
      case "block":
        confirmMessage = `Are you sure you want to block ${email}? This will log them out and prevent them from accessing the system.`;
        break;
      case "delete":
        confirmMessage = `Are you sure you want to permanently delete the account for ${email}? This action cannot be undone and will delete all their data.`;
        break;
    }

    if (window.confirm(confirmMessage)) {
      userActionMutation.mutate({ email, action });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isDeletedUser = (user: AdminUser) => user.email.includes("deleted.com");

  const filteredUsers =
    users?.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesVerified =
        filterVerified === "all" ||
        (filterVerified === "verified" && user.verified) ||
        (filterVerified === "unverified" && !user.verified);

      const matchesAdmin =
        filterAdmin === "all" ||
        (filterAdmin === "admin" && user.admin) ||
        (filterAdmin === "user" && !user.admin);

      const matchesDeleted =
        filterDeleted === "all" ||
        (filterDeleted === "deleted" && isDeletedUser(user)) ||
        (filterDeleted === "active" && !isDeletedUser(user));

      return matchesSearch && matchesVerified && matchesAdmin && matchesDeleted;
    }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Users</h2>
          <p className="text-base-content/70">Unable to retrieve user data</p>
        </div>
      </div>
    );
  }

  const isCurrentUser = (user: AdminUser) => currentUser?.email === user.email;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl leading-[1.1] text-left mb-2">
            User Management
          </h1>
          <p className="text-base-content/70">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <span className="text-lg font-bold text-primary">
            {filteredUsers.length} users
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-lg border border-base-200 mb-6">
        <div className="card-body p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input input-bordered w-full pl-10"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-base-content/50" />
                <select
                  value={filterDeleted}
                  onChange={(e) =>
                    setFilterDeleted(
                      e.target.value as "all" | "active" | "deleted"
                    )
                  }
                  className="select select-bordered select-sm"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Users</option>
                  <option value="deleted">Deleted Users</option>
                </select>
              </div>

              {/* Verified Filter */}
              <div>
                <select
                  value={filterVerified}
                  onChange={(e) =>
                    setFilterVerified(
                      e.target.value as "all" | "verified" | "unverified"
                    )
                  }
                  className="select select-bordered select-sm"
                >
                  <option value="all">All Status</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              {/* Admin Filter */}
              <div>
                <select
                  value={filterAdmin}
                  onChange={(e) =>
                    setFilterAdmin(e.target.value as "all" | "admin" | "user")
                  }
                  className="select select-bordered select-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="user">Users</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-base-100 shadow-lg border border-base-200">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isDeleted = isDeletedUser(user);
                const isCurrentUserRow = isCurrentUser(user);

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-base-200/50 ${
                      isCurrentUserRow
                        ? "bg-primary/5 border-l-4 border-primary"
                        : ""
                    } ${isDeleted ? "opacity-60" : ""}`}
                  >
                    {/* User Info */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div
                            className={`${
                              isDeleted
                                ? "bg-transparent/20 text-error"
                                : "bg-transparent text-neutral-content"
                            } rounded-full w-12`}
                          >
                            <img
                              src={`https://new.autophontest.se/api/v1/static/profile/${user?.uuid}`}
                              alt={user.display_name}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {user.display_name}
                            {isCurrentUserRow && (
                              <span className="badge badge-primary font-thin badge-sm">
                                You
                              </span>
                            )}
                            {isDeleted && (
                              <span className="badge badge-error font-thin badge-sm flex items-center gap-1">
                                <UserMinus className="w-3 h-3" />
                                Deleted
                              </span>
                            )}
                          </div>
                          <div className="text-sm opacity-50">
                            {user.title || "No title"}
                          </div>
                          {user.org && (
                            <div className="text-xs opacity-40">{user.org}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td>
                      <span
                        className={`font-mono text-sm ${
                          isDeleted ? "line-through text-error" : ""
                        }`}
                      >
                        {user.email}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td>
                      {isDeleted ? (
                        <div className="flex items-center gap-1 text-error">
                          <UserMinus className="w-4 h-4" />
                          <span className="text-sm font-medium">Deleted</span>
                        </div>
                      ) : user.verified ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-warning">
                          <XCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Unverified
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Admin Status */}
                    <td>
                      {user.admin ? (
                        <div className="flex items-center gap-1 text-info">
                          <Crown className="w-4 h-4" />
                          <span className="text-sm font-medium">Admin</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-base-content/60">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">User</span>
                        </div>
                      )}
                    </td>

                    {/* Created Date */}
                    <td>
                      <span className="text-sm">
                        {formatDate(user.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex gap-1">
                        {!isDeleted && (
                          <>
                            {/* Verify Button */}
                            {!user.verified && (
                              <div className="tooltip" data-tip="Verify User">
                                <button
                                  onClick={() =>
                                    handleUserAction(user.email, "verify")
                                  }
                                  disabled={userActionMutation.isPending}
                                  className="btn btn-success btn-xs"
                                  title="Verify User"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Make Admin Button */}
                            {!user.admin && !isCurrentUserRow && (
                              <div className="tooltip" data-tip="Make Admin">
                                <button
                                  onClick={() =>
                                    handleUserAction(user.email, "make_admin")
                                  }
                                  disabled={userActionMutation.isPending}
                                  className="btn btn-info btn-xs"
                                  title="Make Admin"
                                >
                                  <Crown className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Block Button */}
                            {!isCurrentUserRow && (
                              <div className="tooltip" data-tip="Block User">
                                <button
                                  onClick={() =>
                                    handleUserAction(user.email, "block")
                                  }
                                  disabled={userActionMutation.isPending}
                                  className="btn btn-warning btn-xs"
                                  title="Block User"
                                >
                                  <UserX className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Delete Button */}
                            {!isCurrentUserRow && (
                              <div className="tooltip" data-tip="Delete User">
                                <button
                                  onClick={() =>
                                    handleUserAction(user.email, "delete")
                                  }
                                  disabled={userActionMutation.isPending}
                                  className="btn btn-error btn-xs"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {isDeleted && (
                          <span className="text-xs text-error font-medium">
                            No actions available
                          </span>
                        )}

                        {/* Loading Indicator */}
                        {userActionMutation.isPending && (
                          <div className="flex items-center justify-center w-6">
                            <Loader2 className="w-3 h-3 animate-spin" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-base-content/20 mx-auto mb-4" />
              <p className="text-base-content/60">
                No users found matching your criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
