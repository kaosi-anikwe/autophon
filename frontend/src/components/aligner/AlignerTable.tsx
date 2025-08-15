import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import type { Task } from "@/types/api";
import AlignerRow from "./AlignerRow";
import TableSkeleton from "../ui/TableSkeleton";

type AlignerTableProps = {
  tasks: Task[] | undefined;
  isLoading?: boolean;
};

export default function AlignerTable({ tasks, isLoading = false }: AlignerTableProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  console.log("User tasks:", tasks);

  // Reset selections when tasks change
  useEffect(() => {
    setSelectedTasks(new Set());
    setSelectAll(false);
  }, [tasks]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && tasks) {
      setSelectedTasks(new Set(tasks.map((task) => task.task_id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleTaskSelect = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);

    // Update select all state
    if (tasks) {
      setSelectAll(newSelected.size === tasks.length);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;

    try {
      // Call bulk delete API
      console.log("Deleting tasks:", Array.from(selectedTasks));
      // TODO: Implement API call for bulk delete
    } catch (error) {
      console.error("Failed to delete tasks:", error);
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="max-h-[40rem] overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead className="table-pin-rows text-center">
          <tr>
            <th className="p-2">
              <Trash2
                className={`w-4 h-4 cursor-pointer ${
                  selectedTasks.size > 0
                    ? "text-error hover:text-error/80"
                    : "text-accent"
                }`}
                onClick={handleBulkDelete}
                title={
                  selectedTasks.size > 0
                    ? `Delete ${selectedTasks.size} selected tasks`
                    : "Select tasks to delete"
                }
              />
            </th>
            <th className="text-center cursor-pointer p-2">
              <label htmlFor="check-all">
                <input
                  type="checkbox"
                  id="check-all"
                  className="checkbox checkbox-xs"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </label>
            </th>

            <th className="p-2">Name</th>
            <th className="p-2">Language</th>
            <th className="p-2">Engine</th>
            <th className="p-2">Tiers</th>
            <th className="p-2">Size MB</th>
            <th className="p-2">Words</th>
            <th className="p-2 w-16">Missing Words</th>
            <th className="p-2">Last status</th>
            <th className="p-2">Download</th>
          </tr>
        </thead>
        <tbody>
          {!tasks || tasks.length === 0 ? (
            <tr>
              <td className="p-0" colSpan={999}>
                <p className="bg-base-200 text-center w-full border-t border-neutral">
                  No data available in table
                </p>
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <AlignerRow
                key={task.id}
                task={task}
                checked={selectedTasks.has(task.task_id)}
                onCheckedChange={(checked) =>
                  handleTaskSelect(task.task_id, checked)
                }
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
