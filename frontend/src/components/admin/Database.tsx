export default function AdminDatabase() {
  return (
    <div className="space-y-6 pt-4">
      <h2 className="text-3xl font-bold">Database Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Database Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Connection Status</span>
                <span className="badge badge-success">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Last Backup</span>
                <span>2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span>Total Records</span>
                <span>45,678</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Quick Actions</h3>
            <div className="space-y-2">
              <button className="btn btn-outline w-full">Create Backup</button>
              <button className="btn btn-outline w-full">
                Optimize Database
              </button>
              <button className="btn btn-outline w-full">
                Run Maintenance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
