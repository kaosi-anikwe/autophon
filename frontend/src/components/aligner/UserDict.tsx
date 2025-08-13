import { Info } from "lucide-react";

export default function UserDict() {
  return (
    <div className="card shadow-lg space-y-4 bg-base-100 border border-base-200 p-4">
      <div className="flex flex-col-reverse items-center">
        <div className="flex items-center">
          <h3 className="text-lg font-bold mr-4">Your Custom Pronunciations</h3>
          <Info className="w-5 h-5 cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
