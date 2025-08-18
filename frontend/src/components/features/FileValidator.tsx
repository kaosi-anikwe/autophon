import React, { useState } from "react";
import JSZip from "jszip";
import { useToast } from "@/contexts/ToastContext";
import { useConfig } from "@/contexts/AppConfigContext";

interface FileValidatorProps {
  onFilesValidated?: (files: FileList) => void;
  isUploading?: boolean;
}

export default function FileValidator({
  onFilesValidated,
  isUploading = false,
}: FileValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const toast = useToast();
  const config = useConfig();

  // Allowed file extensions from the JavaScript validation
  const allowedExtensions = [
    "wav",
    "mp3",
    "avi",
    "m4a",
    "ac-3",
    "aiff",
    "alac",
    "flac",
    "m4r",
    "ogg",
    "opus",
    "wma",
    "lab",
    "textgrid",
    "eaf",
    "tsv",
    "txt",
    "xlsx",
  ];

  // Check if file is an audio file (based on messages_2.js)
  const isAudioFile = (fileName: string): boolean => {
    const audioExtensions = [
      "wav",
      "mp3",
      "avi",
      "m4a",
      "ac-3",
      "aiff",
      "alac",
      "flac",
      "m4r",
      "ogg",
      "opus",
      "wma",
    ];
    const extension = fileName.split(".").pop()?.toLowerCase();
    return audioExtensions.includes(extension || "");
  };

  // Count files in ZIP
  const countFilesInZip = async (
    zipFile: File
  ): Promise<[number, string[]]> => {
    const zip = new JSZip();
    const zipData = await zip.loadAsync(zipFile);
    const fileList: string[] = [];

    zipData.forEach((relativePath, file) => {
      if (!file.dir) {
        fileList.push(relativePath);
      }
    });

    return [fileList.length, fileList];
  };

  // Check file extensions (from messages_2.js)
  const checkExtensions = (
    files: FileList | string[],
    isZip: boolean
  ): { error: boolean; badFile?: string } => {
    const fileList = isZip
      ? (files as string[])
      : Array.from(files as FileList).map((f) => f.name);

    for (const fileName of fileList) {
      const extension = fileName.split(".").pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return { error: true, badFile: fileName };
      }
    }

    return { error: false };
  };

  // Group files and validate pairs (from messages_2.js)
  const groupFiles = (files: FileList): boolean => {
    const audioFiles: string[] = [];
    const transcriptionFiles: string[] = [];

    Array.from(files).forEach((file) => {
      const baseName = file.name.substring(0, file.name.lastIndexOf("."));

      if (isAudioFile(file.name)) {
        audioFiles.push(baseName);
      } else {
        transcriptionFiles.push(baseName);
      }
    });

    // Check if every audio file has a corresponding transcription file
    for (const audioBaseName of audioFiles) {
      if (!transcriptionFiles.includes(audioBaseName)) {
        return true; // Error: missing transcription file
      }
    }

    // Check if every transcription file has a corresponding audio file
    for (const transBaseName of transcriptionFiles) {
      if (!audioFiles.includes(transBaseName)) {
        return true; // Error: missing audio file
      }
    }

    return false; // No error
  };

  const validateFiles = async (files: FileList) => {
    if (!files || files.length === 0) {
      toast.error("Please select files first");
      return;
    }

    setIsValidating(true);

    // Check total file size against limit
    const totalSize = Array.from(files).reduce(
      (acc, file) => acc + file.size,
      0
    );
    const totalSizeMB = totalSize / (1024 * 1024);

    if (config?.userLimits?.size_limit) {
      const sizeLimitMB = config.userLimits.size_limit;
      if (totalSizeMB > sizeLimitMB) {
        toast.error(
          `Total file size (${totalSizeMB.toFixed(
            1
          )} MB) exceeds the maximum allowed limit of ${sizeLimitMB} MB. Please reduce the file size or number of files.`,
          "File Size Limit Exceeded"
        );
        setIsValidating(false);
        return;
      }
    }

    try {
      const fileCount = files.length;

      // Single ZIP file validation
      if (fileCount === 1 && files[0].name.toLowerCase().endsWith(".zip")) {
        const zipFile = files[0];

        try {
          const [fileCount, fileList] = await countFilesInZip(zipFile);

          // Disable file extension check for zip files
          // const { error, badFile } = checkExtensions(fileList, true);

          // if (error) {
          //   toast.error(`File "${badFile}" is not supported`);
          //   return;
          // }

          console.log("ZIP file validation successful:", {
            fileName: zipFile.name,
            filesInZip: fileCount,
            fileList: fileList,
          });

          if (onFilesValidated) {
            onFilesValidated(files);
          }
        } catch (zipError) {
          toast.error("Error reading ZIP file");
          console.error("ZIP validation error:", zipError);
          return;
        }
      }
      // Multiple files validation (non-ZIP)
      else {
        const { error, badFile } = checkExtensions(files, false);

        if (error) {
          toast.error(`File "${badFile}" is not supported`);
          return;
        }

        // Check if files have matching audio and transcription pairs
        if (groupFiles(files)) {
          toast.error(
            "Every audio file should have a corresponding transcription file by the same name"
          );
          return;
        }

        console.log("Multiple files validation successful:", {
          fileCount: files.length,
          files: Array.from(files).map((f) => f.name),
        });

        if (onFilesValidated) {
          onFilesValidated(files);
        }
      }
    } catch (error) {
      toast.error("An error occurred during file validation");
      console.error("File validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      validateFiles(files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="form-control">
        <input
          type="file"
          multiple
          className="file-input file-input-bordered w-full font-thin"
          onChange={handleFileInputChange}
          disabled={isValidating || isUploading}
          accept=".wav,.mp3,.avi,.m4a,.ac-3,.aiff,.alac,.flac,.m4r,.ogg,.opus,.wma,.lab,.textgrid,.eaf,.tsv,.txt,.xlsx,.zip"
        />
      </div>

      {isValidating && (
        <div className="flex items-center space-x-2">
          <span className="loading loading-spinner loading-sm"></span>
          <span className="text-sm">Validating files...</span>
        </div>
      )}
    </div>
  );
}
