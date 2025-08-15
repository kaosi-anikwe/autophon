import { useQuery } from "@tanstack/react-query";
import { teamAPI } from "../lib/api";
import TeamCategory from "@/components/team/TeamCategory";

function LoadingSkeleton() {
  return (
    <>
      <h1 className="text-[3.5rem] leading-[1.1] text-left mb-4 pb-4">
        Autophon Team
      </h1>
      {Array.from({ length: 2 }).map((_, categoryIndex) => (
        <div key={categoryIndex} className="pb-4">
          <h3 className="text-[2rem] text-left font-bold mb-4 pb-4">
            <div className="h-8 bg-base-300 rounded w-48 animate-pulse"></div>
          </h3>
          {Array.from({ length: 3 }).map((_, memberIndex) => (
            <div key={memberIndex} className="mb-6">
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-base-300 rounded animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-6 bg-base-300 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-base-300 rounded w-24 mb-3 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-base-300 rounded animate-pulse"></div>
                    <div className="h-4 bg-base-300 rounded animate-pulse"></div>
                    <div className="h-4 bg-base-300 rounded w-3/4 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <>
      <h1 className="text-[3.5rem] leading-[1.1] text-left mb-4 pb-4">
        Autophon Team
      </h1>
      <div className="alert alert-error">
        <span>Failed to load team data: {error.message}</span>
      </div>
    </>
  );
}

export function TeamPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["team-members"],
    queryFn: teamAPI.getTeamMembers,
    staleTime: 15 * 60 * 1000, // 15 minutes - team data doesn't change frequently
    retry: 2,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  const { team } = data!;

  return (
    <>
      <h1 className="text-[3.5rem] leading-[1.1] text-left mb-4 pb-4">
        Autophon Team
      </h1>
      {team.map((category) => (
        <TeamCategory
          key={category.name}
          title={category.name}
          members={category.members}
        />
      ))}
    </>
  );
}
