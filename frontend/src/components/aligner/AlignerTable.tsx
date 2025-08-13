import { CirclePlus, Trash2 } from "lucide-react";

type AlignerTableProps = {
  title: string;
  homepage?: boolean;
};

export default function AlignerTable({ title, homepage }: AlignerTableProps) {
  let titleClasses = "text-2xl font-bold flex items-center";
  if (homepage) titleClasses += " py-8";

  return (
    <div className="card shadow-lg border-0 bg-base-100 pb-5">
      <div className="p-6">
        <div className="w-full flex justify-center">
          <button
            className="text-accent bg-transparent border-0 p-0 cursor-pointer"
            type="button"
          >
            <h4 className={titleClasses}>
              <span className="text-2xl mr-2">
                <CirclePlus className="w-6 h-6 text-base-100 fill-accent" />
              </span>
              {title}*
            </h4>
          </button>
        </div>

        <div className="max-h-[40rem] overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
          <table className="table table-zebra">
            <thead className="table-pin-rows text-center">
              <tr>
                <th className="p-2">
                  <Trash2 className="w-4 h-4 text-accent cursor-pointer" />
                </th>
                <th className="text-center cursor-pointer p-2">
                  <label htmlFor="check-all">
                    <input
                      type="checkbox"
                      id="check-all"
                      className="checkbox checkbox-xs"
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
              <tr>
                <td className="p-0" colSpan={999}>
                  <p className="bg-base-200 text-center w-full border-t border-neutral">
                    No data available in table
                  </p>
                </td>
              </tr>
              {/* Empty table body - data would be populated dynamically */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
