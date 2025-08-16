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
              <thead className="table-pin-rows text-center bg-neutral text-neutral-content font-thin">
                <tr className="font-thin">
                  <th className="p-2">Date</th>
                  <th className="p-2">Tiers</th>
                  <th className="p-2">Language</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Words</th>
                  <th className="p-2">Last status</th>
                  <th className="p-2 w-52">Deleted</th>
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

          {/* Fixed Totals Row */}
          {totals && (
            <div className="sticky bottom-0 bg-neutral text-neutral-content font-thin rounded-b-box">
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    <tr className="font-normal">
                      <td className="p-2 text-center">
                        <span className="text-sm font-bold">TOTALS</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm">{totals.task_count}</span>
                      </td>
                      <td className="p-2 text-center" colSpan={2}>
                        <div className="">
                          {Object.entries(totals.language_counts).map(
                            ([lang, count]) => (
                              <div key={lang} className="">
                                {lang}: {count}
                              </div>
                            )
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm">
                          {totals.total_size.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm">{totals.total_words}</span>
                      </td>

                      <td className="p-2 text-center">
                        <span className="text-sm">
                          {totals.file_count} files
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
