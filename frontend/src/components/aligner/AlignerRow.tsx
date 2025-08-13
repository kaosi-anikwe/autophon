import type React from "react";
import { useState } from "react";

type AligerRowProps = {
  children: React.ReactNode;
};

export default function AlignerRow({ children }: AligerRowProps) {
  const [active, setActive] = useState(false);

  return (
    <tr
      className={active ? "bg-base-200" : ""}
      onClick={() => setActive((prev) => !prev)}
    >
      {children}
    </tr>
  );
}
