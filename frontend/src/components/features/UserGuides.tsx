import type React from "react";

type UserGuidesProps = {
  children: React.ReactNode;
};

export default function UserGuides({ children }: UserGuidesProps) {
  return (
    <div className="space-y-2 w-full">
      {children}
      <input
        id="guides"
        type="text"
        placeholder="Type in language to find guide"
        className="input w-full"
      />
    </div>
  );
}
