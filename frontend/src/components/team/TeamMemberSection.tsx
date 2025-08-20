import type { TeamMember } from "@/types/api";

export default function TeamMemberSection({
  name,
  image,
  role,
  bio,
}: TeamMember) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-4">
      <div className="md:col-span-2">
        <div className="card shadow-md w-full relative">
          <img
            className="object-cover w-full h-full rounded relative top-0 left-0"
            src={`https://new.autophontest.se/${image}`}
            alt={name}
          />
        </div>
      </div>
      <div className="md:col-span-10">
        <div className="card bg-base-100 shadow-lg border-0 p-3 min-h-full">
          <h3 className="text-[1.75rem] text-left font-bold">{name}</h3>
          <p className="text-base-content/50 mb-2">{role}</p>
          <div
            className="leading-normal"
            dangerouslySetInnerHTML={{ __html: bio }}
          />
        </div>
      </div>
    </div>
  );
}
