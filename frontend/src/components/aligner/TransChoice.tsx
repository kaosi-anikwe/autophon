import type React from "react";

type TransChoiceProps = {
  title: string;
  isActive: boolean;
  video?: string;
  instructions: string;
  onSelect: () => void;
  children: React.ReactNode;
};

export default function TransChoice({
  title,
  isActive,
  video,
  children,
  instructions,
  onSelect,
}: TransChoiceProps) {
  const cardClasses = `card ${
    isActive
      ? "bg-neutral shadow-secondary shadow-xl"
      : "bg-neutral/60 hover:bg-neutral/70"
  } text-neutral-content h-full cursor-pointer hover:shadow-secondary hover:shadow-2xl duration-300 transition-all ease-in-out`;

  return (
    <div className={cardClasses} onClick={onSelect}>
      <div className="card-body p-4 flex flex-col h-full">
        <div className="flex-none">
          <h2 className="font-bold text-xl text-center mx-auto">{title}</h2>
          <p
            id={video}
            className="text-sm text-neutral-content/80 mb-4 text-center"
          >
            (click to see video guide)
          </p>

          {/* Dividing line */}
          <div className="divider my-0"></div>
        </div>

        {/* File Structure - fixed spacing */}
        <div className="flex-none">
          <div className="font-cascadia bg-neutral-focus p-3 pt-0 rounded text-sm text-amber-50 space-y-1">
            {children}
          </div>
        </div>

        {/* Description - pushed to bottom */}
        <div className="flex-1 flex items-end">
          <p className="text-xs italic text-neutral-content/90">
            {instructions}
          </p>
        </div>
      </div>
    </div>
  );
}
