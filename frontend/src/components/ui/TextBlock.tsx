import type React from "react";

type TextBlockProps = {
  title: string;
  children: React.ReactNode;
};

export default function TextBlock({ title, children }: TextBlockProps) {
  return (
    <>
      <h5 className="text-xl font-bold">{title}</h5>
      <div className="space-y-4 mb-2">
        <div className="text base leading-relaxed">{children}</div>
      </div>
    </>
  );
}
