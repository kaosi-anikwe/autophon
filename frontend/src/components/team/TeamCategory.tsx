import type { TeamMember } from "@/types/api";
import TeamMemberSection from "./TeamMemberSection";

type TeamCategoryProps = {
  title: string;
  members: TeamMember[];
};

export default function TeamCategory({ title, members }: TeamCategoryProps) {
  return (
    <div className="pb-4">
      <h3 className="text-[2rem] text-left font-bold mb-4 pb-4">{title}</h3>
      {members.map((member) => (
        <TeamMemberSection key={member.name} {...member} />
      ))}
    </div>
  );
}
