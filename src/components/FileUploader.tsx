import { useCallback, useRef, useState } from "react";
import { Upload, X, FileImage, FileVideo } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/webp",
  "video/mp4", "video/quicktime",
];
const MAX_SIZE = 200 * 1024 * 1024; // 200MB

interface FileUploaderProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

export default function FileUploader({ file, onFileSelect }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      alert("Unsupported file type. Please use PNG, JPG, WEBP, MP4, or MOV.");
      return;
    }
    if (f.size > MAX_SIZE) {
      alert("File too large. Maximum size is 200MB.");
      return;
    }
    onFileSelect(f);
  }, [onFileSelect]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const isVideo = file?.type.startsWith("video");

  if (file) {
    return (
      <div className="relative rounded-lg border border-border bg-card p-4">
        <button
          onClick={() => onFileSelect(null)}
          className="absolute top-2 right-2 rounded-full bg-muted p-1 hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3">
          {isVideo ? (
            <FileVideo className="h-10 w-10 text-primary shrink-0" />
          ) : (
            <FileImage className="h-10 w-10 text-primary shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split("/")[1].toUpperCase()}
            </p>
          </div>
        </div>
        {!isVideo && (
          <img
            src={URL.createObjectURL(file)}
            alt="Preview"
            className="mt-3 rounded-md max-h-48 w-full object-contain bg-muted"
          />
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.mp4,.mov"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium text-foreground">
        Drop your file here or <span className="text-primary">browse</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        PNG, JPG, WEBP, MP4, MOV · Max 200MB
      </p>
    </div>
  );
}
