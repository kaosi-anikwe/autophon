import type { Task, HistoryTotals } from "@/types/api";
import TableSkeleton from "../ui/TableSkeleton";

type HistoryTableProps = {
  tasks: Task[] | undefined;
  totals?: HistoryTotals;
  isLoading?: boolean;
};

export default function HistoryTable({
  tasks,
  totals,
  isLoading = false,
}: HistoryTableProps) {
  // Show skeleton while loading
  if (isLoading || !tasks) {
    return <TableSkeleton rows={5} />;
  }

  const getStatusBadge = (status: Task["task_status"]) => {
    const statusClasses = {
      uploading: "badge-info",
      uploaded: "badge-warning",
      aligned: "badge-primary",
      completed: "badge-success",
      failed: "badge-error",
      cancelled: "badge-neutral",
    };

    return (
      <span className={`badge ${statusClasses[status]} text-xs`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  function parseDateTime(dateTimeString: string): string {
    try {
      const date = new Date(dateTimeString);

      if (isNaN(date.getTime())) {
        throw new Error("Invalid date string");
      }

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch (error) {
      console.error("Error parsing date:", error);
      return "Invalid date";
    }
  }

  return (
    <div className="bg-base-100 pb-5">
      <div className="p-6">
        <div className="relative">
          <div className="max-h-[40rem] overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
            <table className="table">
              <thead className="sticky top-0 z-10 text-center bg-neutral text-neutral-content font-thin">
                <tr className="font-thin">
                  <th className="p-2 font-thin">Date</th>
                  <th className="p-2 font-thin w-16">Tiers</th>
                  <th className="p-2 font-thin">Language</th>
                  <th className="p-2 font-thin w-20">Size</th>
                  <th className="p-2 font-thin w-20">Words</th>
                  <th className="p-2 font-thin">Last status</th>
                  <th className="p-2 w-60 font-thin">Deleted</th>
                </tr>
              </thead>
              <tbody>
                {!tasks || tasks.length === 0 ? (
                  <tr>
                    <td className="p-0" colSpan={7}>
                      <p className="bg-base-200 text-center w-full border-t border-neutral py-4">
                        No data available in table
                      </p>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="even:bg-base-200/10 hover:bg-base-200/20"
                    >
                      <td className="p-2 text-center">
                        {task.download_date ? task.download_date : "N/A"}
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm">
                          {task.no_of_tiers || "N/A"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm">
                            {task.language?.display_name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm">{task.size}</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm">{task.words || "N/A"}</span>
                      </td>
                      <td className="p-2 text-center">
                        {getStatusBadge(task.task_status)}
                      </td>
                      <td className="p-2 text-left">
                        <span className="text-sm">
                          {task.deleted ? parseDateTime(task.deleted) : ""}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Redesigned Totals Dashboard */}
          {totals && (
            <div className="mt-6 space-y-4">
              {/* Header Section */}
              <div className="flex items-center justify-between bg-neutral text-neutral-content px-6 py-4 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                  <h2 className="text-xl font-bold tracking-wide">
                    MONTHLY ANALYTICS
                  </h2>
                </div>
                <div className="text-sm opacity-80 font-mono">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>

              {/* Main Statistics Grid */}
              <div className="bg-base-100 border-x border-base-300 px-6 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  {/* Tasks Metric */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5 hover:shadow-lg transition-all duration-200 group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -mr-8 -mt-8"></div>
                    <div className="relative">
                      <div className="text-primary/60 text-sm font-medium uppercase tracking-wider mb-2">
                        Tasks Completed
                      </div>
                      <div className="text-3xl font-black text-primary mb-1">
                        {totals.task_count}
                      </div>
                      <div className="text-xs text-base-content/60">
                        alignment jobs
                      </div>
                    </div>
                  </div>

                  {/* Files Metric */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-xl p-5 hover:shadow-lg transition-all duration-200 group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-secondary/10 rounded-full -mr-8 -mt-8"></div>
                    <div className="relative">
                      <div className="text-secondary/60 text-sm font-medium uppercase tracking-wider mb-2">
                        Total Files
                      </div>
                      <div className="text-3xl font-black text-secondary mb-1">
                        {totals.file_count}
                      </div>
                      <div className="text-xs text-base-content/60">
                        audio files processed
                      </div>
                    </div>
                  </div>

                  {/* Size Metric */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-xl p-5 hover:shadow-lg transition-all duration-200 group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full -mr-8 -mt-8"></div>
                    <div className="relative">
                      <div className="text-accent/60 text-sm font-medium uppercase tracking-wider mb-2">
                        Data Volume
                      </div>
                      <div className="text-3xl font-black text-accent mb-1">
                        {totals.total_size.toFixed(1)}
                      </div>
                      <div className="text-xs text-base-content/60">
                        megabytes total
                      </div>
                    </div>
                  </div>

                  {/* Words Metric */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-xl p-5 hover:shadow-lg transition-all duration-200 group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-info/10 rounded-full -mr-8 -mt-8"></div>
                    <div className="relative">
                      <div className="text-info/60 text-sm font-medium uppercase tracking-wider mb-2">
                        Words Aligned
                      </div>
                      <div className="text-3xl font-black text-info mb-1">
                        {totals.total_words.toLocaleString()}
                      </div>
                      <div className="text-xs text-base-content/60">
                        phonetic segments
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Languages Section */}
              {Object.keys(totals.language_counts).length > 0 && (
                <div className="bg-base-100 border-x border-base-300 px-6 py-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-base-content mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-warning rounded-full"></span>
                      Language Distribution
                    </h3>
                    <div className="w-full bg-base-200 rounded-full h-1">
                      <div
                        className="bg-gradient-to-r from-primary via-secondary to-accent h-1 rounded-full"
                        style={{ width: "100%" }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {Object.entries(totals.language_counts).map(
                      ([lang, count]) => {
                        return (
                          <div
                            key={lang}
                            className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center hover:shadow-md transition-all duration-200"
                          >
                            <div className="text-primary font-bold text-lg">
                              {count}
                            </div>
                            <div className="text-xs text-base-content/70 uppercase tracking-wide font-medium mt-1">
                              {lang}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Footer Border */}
              <div className="h-px bg-gradient-to-r from-transparent via-base-300 to-transparent rounded-b-lg"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
