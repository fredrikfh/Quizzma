import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
  onSubmit?: (fileContents: string[]) => Promise<void> | void;
  onFilesChange?: (files: string[]) => void;
  submitButtonText?: string;
  hideDefaultActions?: boolean;
  className?: string;
}

interface UploadedFile {
  name: string;
  content: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onSubmit,
  onFilesChange,
  submitButtonText = "Submit Files",
  hideDefaultActions = false,
  className,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (onFilesChange) {
      onFilesChange(files.map((file) => file.content));
    }
  }, [files, onFilesChange]);

  const handleFiles = async (fileList: FileList) => {
    const fileArray = Array.from(fileList);
    // Filter for text files (by MIME type or file extension)
    const textFiles = fileArray.filter(
      (file) => file.type.startsWith("text") || file.name.endsWith(".txt"),
    );

    const uploadedFiles: UploadedFile[] = await Promise.all(
      textFiles.map(async (file) => {
        const content = await file.text();
        return { name: file.name, content };
      }),
    );

    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleFiles(e.target.files);
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    setLoading(true);
    try {
      const fileContents = files.map((file) => file.content);
      await onSubmit(fileContents);
    } catch (error) {
      console.error("Error submitting files:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFiles = () => {
    setFiles([]);
  };

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <p className="text-sm text-gray-600">
          Drag and drop your text files here, or click to select files
        </p>
        <input
          id="fileInput"
          type="file"
          multiple
          accept="text/*"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-medium">Uploaded Files:</h4>
          <ul className="mt-2 space-y-1">
            {files.map((file, index) => (
              <li key={index} className="text-sm text-gray-700">
                {file.name}
              </li>
            ))}
          </ul>
          {!hideDefaultActions && (
            <div className="mt-4 flex space-x-2">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                variant="default"
              >
                {loading ? "Submitting..." : submitButtonText}
              </Button>
              <Button onClick={clearFiles} variant="destructive">
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
