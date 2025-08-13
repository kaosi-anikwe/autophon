export default function HistoryTable() {
  return (
    <div className="card shadow-lg border-0 bg-base-100 pb-5">
      <div className="p-6">
        <div className="max-h-[40rem] overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
          <table className="table table-zebra">
            <thead className="table-pin-rows text-center">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Tiers</th>
                <th className="p-2">Language</th>
                <th className="p-2">Size</th>
                <th className="p-2">Words</th>
                <th className="p-2">Last status</th>
                <th className="p-2 w-16">Deleted</th>
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
