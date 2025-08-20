import { useState, useEffect, memo } from "react";
import { Trash2, Info } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { motion, AnimatePresence } from "framer-motion";

import type { Task } from "@/types/api";
import AlignerRow from "./AlignerRow";
import TableSkeleton from "../ui/TableSkeleton";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useAppConfig } from "@/contexts/AppConfigContext";

type AlignerTableProps = {
  tasks: Task[] | undefined;
  homepage?: boolean;
  isLoading?: boolean;
};

const AlignerTable = memo(function AlignerTable({
  tasks,
  homepage = false,
  isLoading = false,
}: AlignerTableProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);

  const { config } = useAppConfig();
  const queryClient = useQueryClient();
  const toast = useToast();

  let sizeLimit = "N/A";
  if (config) {
    sizeLimit = homepage
      ? `${config.userLimits.a_size_limit / 1000} MB`
      : `${config.userLimits.size_limit / 1000} MB`;
  }

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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const response = await api.post("/tasks/bulk-delete", {
        task_ids: taskIds,
      });
      return response.data;
    },
    onSuccess: (data, taskIds) => {
      console.log(data);
      toast.success(
        `Successfully deleted ${taskIds.length} task${
          taskIds.length > 1 ? "s" : ""
        }`
      );
      // Clear selections and close modal
      setSelectedTasks(new Set());
      setSelectAll(false);
      setShowDeleteModal(false);
      setTasksToDelete([]);
      // Refetch tasks
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage =
        error.response?.data?.message || "Failed to delete tasks";
      toast.error(errorMessage);
      setShowDeleteModal(false);
    },
  });

  const handleBulkDelete = (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setTasksToDelete(taskIds);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(tasksToDelete);
  };

  // Show skeleton while loading
  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="rounded-box border border-base-content/5 bg-base-100">
      {/* Grid Container */}
      <div className="grid grid-cols-[40px_32px_1fr_200px_200px_64px_64px_64px_96px_140px_64px] max-h-[40rem] overflow-y-auto overflow-x-auto w-full justify-items-stretch">
        {/* Sticky Header */}
        <div className="col-span-11 grid grid-cols-subgrid sticky top-0 bg-base-100 z-10 border-b border-base-300">
          {/* Delete icon */}
          <div className="p-2 flex items-center justify-center text-center font-semibold">
            {selectedTasks.size > 1 && (
              <div className="tooltip tooltip-right">
                <div className="tooltip-content font-thin">
                  {`Delete ${selectedTasks.size} selected tasks`}
                </div>
                <Trash2
                  className="w-4 h-4 cursor-pointer text-error hover:text-error/80"
                  onClick={() => handleBulkDelete(Array.from(selectedTasks))}
                />
              </div>
            )}
          </div>

          {/* Checkbox */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="tooltip tooltip-bottom" data-tip="Select All">
              <label htmlFor="check-all">
                <input
                  type="checkbox"
                  id="check-all"
                  className="checkbox checkbox-xs"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Name</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  Each alignment batch is given a dummy name of "yyyy/mm/dd -
                  hh:mm:ss" using Greenwich Mean Time. Only a record of the
                  dummy name is kept in Autophon&apos;s log.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Language</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  Transcriptions are run through language-detection software,
                  and a language is suggested. For languages with
                  variety-specific models like American English vs. UK English,
                  the indigenous variety will be the default selection (UK
                  English). Flag icons are used because we think graphical cues
                  will reduce the chance of accidentally aligning with the wrong
                  language model.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Engine */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Engine</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  This is the forced aligner engine that drives the actual
                  alignment. These are either facilitated by Hidden Markov
                  Models (e.g., FAVE-Align) or Deep Neural Networks (e.g.,
                  Montreal Forced Aligner).
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Tiers */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex flex-col gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Tiers</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  If a single-tier file is submitted, the output tiers will be
                  labeled "trans", "word", and "phone" for transcription, word,
                  and phone, respectively. If a multi-tier file is submitted,
                  the output tiers will maintain the original tier name,
                  followed by a hyphen, and followed by "trans", "word", and
                  "phone".
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex flex-col leading-5 gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Size MB</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  No more than {sizeLimit} can be uploaded at any given time.
                  This helps keep Autophon lean and – most important of all –
                  free.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Words */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex flex-col gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Words</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  This is calculated so we can make a case to funders that
                  "Autophon aligned so and so many words in 2023". It might also
                  be a useful metric for you.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Missing words */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex flex-col gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Missing Words</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  Autophon bases its phonetic alignments from pre-existing
                  pronunciation dictionaries (see user guide). Any words from
                  your transcription that are missing from the dictionary will
                  be identified here, and a suggested pronunciation will be
                  offerred using a grapheme-to-phoneme converter. These
                  pronunciations will be automatically used for alignment unless
                  you override them in the below "Custom Pronunciations" box.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Last status */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex flex-col gap-1 justify-center items-center">
              <p className="my-auto text-center mt-[0.15rem]">Last status</p>
              <div className="tooltip tooltip-bottom my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  This shows the status of your upload. "Align" indicates that
                  the file is ready for alignment. "Completed" indicates it has
                  already been aligned, and the TextGrids are ready for
                  download. At this stage, the audio file has been deleted.
                  "Error" means something went wrong, and we advise you to
                  contact support. "Add Audio" means your upload went dormant
                  for too long. To keep our storage lean and to protect your
                  data from breaches, *all* audio files are removed every
                  evening from every account at 3AM GMT. Transcription files,
                  however, are maintained so you can add back audio when you are
                  ready to proceed.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Download */}
          <div className="p-2 flex items-center justify-center  text-center font-semibold">
            <div className="flex gap-1 justify-center items-center">
              <div className="tooltip tooltip-left my-auto">
                <div className="tooltip-content text-xs font-thin z-[200]">
                  Completed alignments download as zip files, within which the
                  ASCII-based phones are in one folder and the IPA phones in
                  another.
                </div>
                <Info className="w-4 h-4 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Rows */}
        <AnimatePresence mode="popLayout">
          {!tasks || tasks.length === 0 ? (
            <motion.div
              key="empty-state"
              className="col-span-11 p-4 text-center bg-base-200 border-t border-neutral"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              No data available in table
            </motion.div>
          ) : (
            tasks.map((task, index) => (
              <motion.div
                key={task.task_id}
                className={`contents group transition-colors duration-75 ${
                  selectedTasks.has(task.task_id)
                    ? "[&>*]:bg-primary/10 hover:[&>*]:bg-primary/20"
                    : index % 2 === 0
                    ? "[&>*]:bg-base-100 hover:[&>*]:bg-base-200/50"
                    : "[&>*]:bg-base-200/10 hover:[&>*]:bg-base-200/70"
                }`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    duration: 0.3,
                    delay: index * 0.05, // Stagger animation
                    ease: "easeOut",
                  },
                }}
                exit={{
                  opacity: 0,
                  y: -20,
                  scale: 0.95,
                  transition: {
                    duration: 0.2,
                    ease: "easeIn",
                  },
                }}
                layout
                whileHover={{
                  scale: 1.01,
                  transition: { duration: 0.2 },
                }}
              >
                <AlignerRow
                  task={task}
                  checked={selectedTasks.has(task.task_id)}
                  onCheckedChange={(checked) =>
                    handleTaskSelect(task.task_id, checked)
                  }
                  showDeleteButton={
                    selectedTasks.size === 1 && selectedTasks.has(task.task_id)
                  }
                  onDelete={() => handleBulkDelete([task.task_id])}
                  homepage={homepage}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Confirm Deletion</h3>
            <p className="py-4">
              Are you sure you want to delete {tasksToDelete.length} task
              {tasksToDelete.length > 1 ? "s" : ""}? This action cannot be
              undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-error font-thin"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <img
                      src="/spinner.gif"
                      alt="Deleting..."
                      className="w-auto h-4"
                    />
                    Deleting...
                  </>
                ) : (
                  `Delete ${tasksToDelete.length} Task${
                    tasksToDelete.length > 1 ? "s" : ""
                  }`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AlignerTable;
