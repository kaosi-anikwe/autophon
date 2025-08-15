interface TableSkeletonProps {
  rows?: number;
}

export default function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div className="max-h-[40rem] overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead className="table-pin-rows text-center">
          <tr>
            <th className="p-2">
              <div className="w-4 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="text-center cursor-pointer p-2">
              <div className="w-4 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
            </th>
            <th className="p-2">
              <div className="w-16 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-20 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-16 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-12 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-16 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-12 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2 w-16">
              <div className="w-20 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-20 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
            <th className="p-2">
              <div className="w-16 h-4 bg-base-200 rounded animate-pulse"></div>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <tr key={index} className="text-center nth-[even]:bg-base-200/20">
              {/* Empty column for trash icon alignment */}
              <td></td>

              {/* Checkbox column */}
              <td className="p-2">
                <div className="w-4 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* File name */}
              <td>
                <div className="w-24 h-4 bg-base-200 rounded animate-pulse"></div>
              </td>

              {/* Language dropdown */}
              <td>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-4 h-4 bg-base-200 rounded animate-pulse"></div>
                  <div className="w-12 h-4 bg-base-200 rounded animate-pulse"></div>
                </div>
              </td>

              {/* Engine dropdown */}
              <td>
                <div className="w-16 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* Tiers */}
              <td>
                <div className="w-8 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* Size MB */}
              <td>
                <div className="w-12 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* Words */}
              <td>
                <div className="w-12 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* Missing Words */}
              <td>
                <div className="w-8 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* Status */}
              <td>
                <div className="w-16 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>

              {/* Download column */}
              <td>
                <div className="w-4 h-4 bg-base-200 rounded animate-pulse mx-auto"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
