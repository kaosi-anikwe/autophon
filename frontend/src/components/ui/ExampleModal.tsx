import { useState } from "react";
import { Modal } from "./Modal";
import { Trash2, Edit3 } from "lucide-react";

// Example: Confirmation Modal
export function ConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn btn-error" onClick={() => setIsOpen(true)}>
        Delete Item
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Deletion"
        size="sm"
        actions={
          <div className="flex gap-2">
            <button className="btn" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={() => {
                // Handle deletion
                console.log("Item deleted!");
                setIsOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        }
      >
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </Modal>
    </>
  );
}

// Example: Form Modal
export function EditUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("User updated:", { name, email });
    setIsOpen(false);
  };

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
        <Edit3 className="w-4 h-4 mr-2" />
        Edit User
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit User"
        size="md"
        actions={
          <div className="flex gap-2">
            <button className="btn" onClick={() => setIsOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" form="edit-user-form">
              Save Changes
            </button>
          </div>
        }
      >
        <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </>
  );
}

// Example: Info Modal (no actions)
export function InfoModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="btn btn-info" onClick={() => setIsOpen(true)}>
        View Details
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="System Information"
        size="lg"
      >
        <div className="space-y-4">
          <div className="stats shadow w-full">
            <div className="stat">
              <div className="stat-title">Version</div>
              <div className="stat-value text-primary">v2.1.0</div>
            </div>
            <div className="stat">
              <div className="stat-title">Last Updated</div>
              <div className="stat-value text-secondary">Dec 12</div>
            </div>
          </div>
          <p>
            This is an example of an informational modal with no action buttons.
            Users can close it using the X button or clicking outside.
          </p>
        </div>
      </Modal>
    </>
  );
}

// Demo component showing all examples
export function ModalExamples() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Modal Examples</h2>
      <div className="flex flex-wrap gap-4">
        <ConfirmationModal />
        <EditUserModal />
        <InfoModal />
      </div>
    </div>
  );
}