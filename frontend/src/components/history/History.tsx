import HistoryTable from "./HistoryTable";

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

export default function History() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-2 space-y-6">
        <div className="card shadow-lg bg-base-100 border border-base-200 space-y-4 px-2">
          <div className="mb-0">
            <h3 className="text-center font-bold my-4">Select Year</h3>
            <select
              id="year"
              title="Select Year"
              className="select w-full font-normal mx-auto"
            >
              {years.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-0">
            <ul className="list bg-base-100 rounded-box shadow-md">
              {months.map((month) => (
                <li
                  key={month}
                  className="list-row grid-cols-1 text-center after:bg-base-200 after:border-b"
                >
                  <p className="text-lg text-center">{month}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="md:col-span-10 space-y-6">
        <div className="card shadow-lg bg-base-100 border border-base-200 space-y-4 px-2">
          <HistoryTable />
        </div>
        <div className="text-right">
          <button className="btn btn-primary font-thin">
            Download History for Jul 2025
          </button>
        </div>
      </div>
    </div>
  );
}
