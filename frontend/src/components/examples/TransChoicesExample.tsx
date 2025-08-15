import { useState } from "react";
import TransChoices from "../aligner/TransChoices";

export function TransChoicesExample() {
  const [activeTransChoice, setActiveTransChoice] = useState<string | null>("Computational Ling");

  const handleSelectionChange = (title: string | null) => {
    console.log("Selection changed:", title);
    setActiveTransChoice(title);
  };

  const handleContinue = (selectedTitle: string | null) => {
    console.log("Continue clicked with:", selectedTitle);
    if (selectedTitle) {
      alert(`Continuing with: ${selectedTitle}`);
    } else {
      alert("No transcription choice selected");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">TransChoices Example</h2>
      
      <div className="mb-4 p-4 bg-base-200 rounded">
        <h3 className="text-lg font-semibold mb-2">Current State:</h3>
        <p><strong>Active Choice:</strong> {activeTransChoice || "None"}</p>
        
        <div className="mt-4 flex gap-2">
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setActiveTransChoice("Experimental Ling A")}
          >
            Set Experimental Ling A
          </button>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setActiveTransChoice("Computational Ling")}
          >
            Set Computational Ling
          </button>
          <button 
            className="btn btn-sm btn-secondary"
            onClick={() => setActiveTransChoice(null)}
          >
            Clear Selection
          </button>
        </div>
      </div>

      <TransChoices
        activeTitle={activeTransChoice}
        onSelectionChange={handleSelectionChange}
        onContinue={handleContinue}
      />
    </div>
  );
}

export default TransChoicesExample;