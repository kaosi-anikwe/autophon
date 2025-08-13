export default function Settings() {
  return (
    <div className="space-y-6 pt-4">
      <h2 className="text-3xl font-bold">System Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">General Settings</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Site Name</span>
              </label>
              <input
                type="text"
                placeholder="Autophon"
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Maintenance Mode</span>
              </label>
              <input type="checkbox" className="toggle toggle-primary" />
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Security Settings</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Session Timeout (minutes)</span>
              </label>
              <input
                type="number"
                placeholder="30"
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Two-Factor Authentication</span>
              </label>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
