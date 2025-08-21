import { api } from "@/lib/api";
import { XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import HistoryTable from "./HistoryTable";
import { useToast } from "@/contexts/ToastContext";
import type { Task, HistoryTotals } from "@/types/api";
import { useAppSelector } from "@/hooks/useAppDispatch";

// Generate years from current year back to 2000
const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - 1999 },
  (_, i) => currentYear - i
);
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Get current month and year
const currentDate = new Date();
const currentMonthIndex = currentDate.getMonth();
const currentMonthName = months[currentMonthIndex];

export default function History() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName);
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const [shownError, setShownError] = useState(false);

  // Fetch history data when month or year changes
  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["taskHistory", selectedYear, selectedMonth],
    queryFn: async (): Promise<{ results: Task[]; totals: HistoryTotals }> => {
      const response = await api.get("/tasks/history", {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
      });
      return response.data;
    },
  });

  useEffect(() => {
    if (error && !shownError) {
      toast.error("Failed to load dashboard data", "Error");
      setShownError(true);
    }
  }, [error, toast]);

  const isCurrentMonth = () => {
    if (
      selectedYear === currentYear &&
      selectedMonth === currentMonthName &&
      !user?.admin
    )
      return true;
    else return false;
  };

  const historyTasks = historyData?.results;
  const totals = historyData?.totals;

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(event.target.value));
  };

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
  };

  const handleDownloadHistory = () => {
    if (isCurrentMonth()) {
      toast.error(
        "History downloads are only available at the end of the month",
        "Not allowed"
      );
      return;
    }
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const downloadUrl = `/monthly-download?month=${
      months[monthIndex - 1]
    }&year=${selectedYear}`;

    // Create a link element and trigger download
    const link = document.createElement("a");
    link.href = `${api.defaults.baseURL}${downloadUrl}`;
    link.setAttribute("download", ""); // This will use the filename from the server
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!historyData && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">
            Failed to Load History Table
          </h2>
          <p className="text-base-content/70">
            Unable to retrieve history table. Please try again later
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-2 space-y-6 mb-4 pb-4">
        <div className="card shadow-lg bg-base-100 border border-base-200 space-y-4 px-2">
          <div className="mb-0">
            <h3 className="text-center font-bold my-4">Select Year</h3>
            <select
              id="year"
              title="Select Year"
              className="select w-full font-normal mx-auto"
              value={selectedYear}
              onChange={handleYearChange}
            >
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-0">
            <ul className="list bg-base-100 rounded-box">
              {months.map((month) => (
                <li
                  key={month}
                  className={`list-row grid-cols-1 text-center after:bg-base-200 after:border-b cursor-pointer hover:bg-base-200 ${
                    selectedMonth === month
                      ? "bg-neutral text-neutral-content"
                      : ""
                  }`}
                  onClick={() => handleMonthClick(month)}
                >
                  <p className="text-lg text-center">{month}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="md:col-span-10 space-y-6">
        <div className="card shadow-lg bg-base-100 space-y-4 px-2">
          <HistoryTable
            tasks={historyTasks}
            totals={totals}
            isLoading={isLoading}
          />
        </div>
        <div className="text-right mr-8">
          <div
            className="tooltip"
            data-tip={
              isCurrentMonth()
                ? "Downloads are available at the end of the month."
                : ""
            }
          >
            <button
              className={`btn font-thin mb-4 ${
                isCurrentMonth() ? "btn-disabled" : "btn-neutral"
              }`}
              onClick={handleDownloadHistory}
              disabled={
                isCurrentMonth() || !historyTasks || historyTasks.length === 0
              }
            >
              {!historyTasks || historyTasks.length === 0
                ? `No tasks for ${selectedMonth} ${selectedYear}`
                : `Download History for ${selectedMonth} ${selectedYear}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
