"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, CheckCircle } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export function FileUpload({ onUpload, isLoading }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.toLowerCase().endsWith(".csv")) {
        setSelectedFile(file);
      }
    },
    []
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleUploadClick = useCallback(() => {
    if (selectedFile && !isLoading) {
      onUpload(selectedFile);
    }
  }, [selectedFile, isLoading, onUpload]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Upload CSV</span>
        <span className="text-xs text-slate-600 ml-auto">optional</span>
      </div>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-blue-500 bg-blue-500/5"
              : "border-slate-700 hover:border-slate-600"
          }`}
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <Upload className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Drop CSV here or click to browse</p>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-slate-300 flex-1 truncate">{selectedFile.name}</span>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedFile && (
        <button
          onClick={handleUploadClick}
          disabled={isLoading}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
              Uploading...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Load Dataset
            </>
          )}
        </button>
      )}
    </div>
  );
}
