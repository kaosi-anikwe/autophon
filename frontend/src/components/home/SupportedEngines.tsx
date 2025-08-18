import { useQuery } from "@tanstack/react-query";

import { enginesAPI } from "../../lib/api";
import type { EngineHomepage } from "../../types/api";

interface EngineItemProps {
  engine: EngineHomepage;
}

function EngineItem({ engine }: EngineItemProps) {
  const imagePath = `/ngins/${engine.code}.png`;

  const EngineContent = () => (
    <>
      <img
        src={imagePath}
        alt={`${engine.name} logo`}
        className="max-w-6 h-auto rounded-sm mr-4 flex-shrink-0"
        onError={(e) => {
          // Fallback to gray placeholder if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          target.nextElementSibling?.classList.remove("hidden");
        }}
      />
      <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0 hidden"></div>
      {engine.name}
    </>
  );

  return (
    <div className="flex items-center">
      <div className="w-full">
        {engine.documentation_link ? (
          <a
            href={engine.documentation_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base-content flex items-center font-normal hover:text-primary transition-colors"
          >
            <EngineContent />
          </a>
        ) : (
          <div className="text-base-content flex items-center font-normal">
            <EngineContent />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <h5 className="text-xl font-bold mb-2">Engines</h5>
      <div className="mb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center mb-2">
            <div className="w-6 h-4 bg-gray-300 rounded-sm mr-4 flex-shrink-0 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-40 animate-pulse"></div>
          </div>
        ))}
      </div>
    </>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="text-center py-6">
      <p className="text-red-600 mb-2">Failed to load engines</p>
      <p className="text-sm text-gray-600">{error.message}</p>
    </div>
  );
}

export function SupportedEngines() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["homepage-engines"],
    queryFn: enginesAPI.getHomepageEngines,
    staleTime: 10 * 60 * 1000, // 10 minutes - engines don't change frequently
    retry: 2,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  const { engines } = data!;

  return (
    <>
      <h5 className="text-xl font-bold mb-2">Engines</h5>
      <div className="mb-4">
        {engines.map((engine) => (
          <EngineItem key={engine.id} engine={engine} />
        ))}
      </div>
    </>
  );
}
