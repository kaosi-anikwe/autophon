import { useState, useRef } from "react";
import { Info, FileText } from "lucide-react";
import { Modal } from "../ui/Modal";
import type { LanguageHomepage } from "../../types/api";

interface DictUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: LanguageHomepage | null;
  onUpload: (content: string, mode: "append" | "replace") => void;
  existingContent: string;
}

export function DictUploadModal({
  isOpen,
  onClose,
  selectedLanguage,
  onUpload,
  existingContent,
}: DictUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<"append" | "replace">("append");
  const [uploadedContent, setUploadedContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Format existing content to remove line numbers
  const formattedExistingContent = existingContent
    .replace(/\u00A0/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.replace(/^\d+/, "").trim())
    .join("\n");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith(".dict")) {
      alert("Please upload a .txt or .dict file only.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content.length > 50000) {
        alert(
          "File content exceeds the 50,000 character limit (including whitespaces)."
        );
        return;
      }
      setUploadedContent(content);
    };
    reader.readAsText(file);
  };

  const confirmFileUpload = () => {
    if (uploadMode === "replace") {
      onUpload(uploadedContent, "replace");
    } else {
      const newContent =
        formattedExistingContent +
        (formattedExistingContent ? "\n" : "") +
        uploadedContent;
      if (newContent.length > 50000) {
        alert(
          "Combined content exceeds the 50,000 character limit (including whitespaces)."
        );
        return;
      }
      onUpload(newContent, "append");
    }
    handleClose();
  };

  const handleClose = () => {
    setUploadedContent("");
    setUploadMode("append");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Dictionary File"
      size="md"
    >
      <div className="space-y-4">
        <div className="alert alert-error flex items-center">
          <Info className="w-4 h-4" />
          <span className="text-sm">
            Files must be .txt or .dict format and cannot exceed 50,000
            characters (including whitespaces).
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Upload Mode</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="uploadMode"
                value="append"
                checked={uploadMode === "append"}
                onChange={(e) =>
                  setUploadMode(e.target.value as "append" | "replace")
                }
                className="radio radio-primary radio-sm"
              />
              <span className="text-sm">
                <strong>Append</strong> - Add to existing{" "}
                {selectedLanguage?.display_name} pronunciations
              </span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="uploadMode"
                value="replace"
                checked={uploadMode === "replace"}
                onChange={(e) =>
                  setUploadMode(e.target.value as "append" | "replace")
                }
                className="radio radio-primary radio-sm"
              />
              <span className="text-sm">
                <strong>Replace</strong> - Replace all existing{" "}
                {selectedLanguage?.display_name} pronunciations
              </span>
            </label>
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.dict"
            onChange={handleFileUpload}
            className="file-input file-input-bordered w-full"
          />
        </div>

        {uploadedContent && (
          <div>
            <label className="block text-sm font-medium mb-2">
              File Preview
            </label>
            <div className="textarea textarea-bordered w-full h-32 overflow-y-auto text-xs font-mono bg-base-200 whitespace-pre-wrap">
              {uploadedContent.substring(0, 500)}
              {uploadedContent.length > 500 && "..."}
            </div>
            <div className="text-xs text-base-content/60 mt-1">
              {uploadedContent.length.toLocaleString()} / 50,000 characters
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button onClick={handleClose} className="btn btn-ghost bg-base-200">
            Cancel
          </button>
          <button
            onClick={confirmFileUpload}
            disabled={!uploadedContent}
            className="btn btn-neutral"
          >
            <FileText className="w-4 h-4 mr-2" />
            {uploadMode === "append"
              ? "Add to pronunciations"
              : "Replace pronunciations"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
