export default function EditProfileForm() {
  return (
    <form className="space-y-4 my-4">
      <div className="space-y-2">
        <label htmlFor="title" className="floating-label">
          Title
          <input
            id="title"
            placeholder="Dr., Prof., etc."
            className="input w-full"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="first_name" className="floating-label">
            First Name
            <input id="first_name" placeholder="John" className="input" />
          </label>
        </div>
        <div className="space-y-2">
          <label htmlFor="last_name" className="floating-label">
            Last Name
            <input id="last_name" placeholder="Doe" className="input" />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="floating-label">
          Email address
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="input w-full"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="affiliation" className="floating-label">
          Affiliation
          <input
            id="affiliation"
            placeholder="University, Company, etc."
            className="input w-full"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="org" className="floating-label">
          Organization
          <input
            id="org"
            placeholder="University, Company, etc."
            className="input w-full"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="industry" className="floating-label">
          Industry
          <input
            id="industry"
            placeholder="Education, Research, etc."
            className="input w-full"
          />
        </label>
      </div>

      <button type="submit" className="btn btn-primary font-thin w-[40%]">
        Save changes
      </button>
    </form>
  );
}
