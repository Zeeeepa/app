import { AlertCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  generateUploadUrl,
  uploadFileToVolume,
  uploadLargeFileToS3,
} from "@/components/files-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { formatBytes, formatTime } from "@/lib/utils";
import type { AddModelRequest } from "@/types/models";
import { FolderPathDisplay } from "./folder-path-display";

interface LocalUploadFormProps {
  onSubmit: (request: AddModelRequest) => void;
  folderPath: string;
  className?: string;
  isSubmitting: boolean;
}

export function LocalUploadForm({
  onSubmit,
  folderPath,
  className,
  isSubmitting,
}: LocalUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [volumeName, setVolumeName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStats, setUploadStats] = useState<{
    uploadedSize: number;
    totalSize: number;
    estimatedTime: number;
  } | null>(null);

  useEffect(() => {
    async function fetchVolumeName() {
      try {
        setIsLoading(true);
        const response = await api({
          url: "volume/name",
          init: { method: "GET" },
        });

        if (response?.volume_name) {
          setVolumeName(response.volume_name);
        } else {
          setError("Could not determine volume name for models");
        }
      } catch (err) {
        console.error("Error fetching volume name:", err);
        setError("Failed to get volume information");
      } finally {
        setIsLoading(false);
      }
    }

    fetchVolumeName();
  }, []);

  // Add beforeunload event listener when upload is in progress
  useEffect(() => {
    const isUploading = uploadProgress > 0 && uploadProgress < 100;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        // Standard way to show a confirmation dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = "";
        return "";
      }
    };

    if (isUploading) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploadProgress]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      setFilename(selectedFile.name);
    } else {
      setFilename("");
    }
  };

  const handleSubmit = async () => {
    if (!file || isSubmitting || !volumeName) return;

    try {
      setError(null);
      setUploadProgress(0);
      setUploadStats(null);

      const THRESHOLD = 500 * 1024 * 1024;

      if (file.size >= THRESHOLD) {
        const res = await uploadLargeFileToS3(
          file,
          (progress, uploadedSize, totalSize, estimatedTime) => {
            setUploadProgress(progress);
            setUploadStats({ uploadedSize, totalSize, estimatedTime });
          },
        );

        onSubmit({
          source: "link",
          folderPath,
          filename: filename || file.name,
          downloadLink: `s3://${res.key}`,
          isTemporaryUpload: true,
          s3ObjectKey: res.key,
        });
      } else {
        const { uploadUrl, objectKey } = await generateUploadUrl(
          file.name,
          file.type || "application/octet-stream",
          file.size,
        );

        const xhr = new XMLHttpRequest();
        const uploadStartTime = Date.now();
        let lastLoaded = 0;
        let lastTime = uploadStartTime;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100,
            );

            const currentTime = Date.now();
            const timeElapsed = currentTime - lastTime;

            if (timeElapsed > 1000) {
              const loadDiff = event.loaded - lastLoaded;
              const timePerByte = timeElapsed / loadDiff;
              const bytesRemaining = event.total - event.loaded;
              const estimatedTimeRemaining =
                (bytesRemaining * timePerByte) / 1000;

              setUploadProgress(percentComplete);
              setUploadStats({
                uploadedSize: event.loaded,
                totalSize: event.total,
                estimatedTime: estimatedTimeRemaining,
              });

              lastLoaded = event.loaded;
              lastTime = currentTime;
            } else {
              setUploadProgress(percentComplete);
              setUploadStats({
                uploadedSize: event.loaded,
                totalSize: event.total,
                estimatedTime: uploadStats?.estimatedTime || 0,
              });
            }
          }
        };

        await new Promise<void>((resolve, reject) => {
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream",
          );

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error("Network error during upload"));
          };

          xhr.send(file);
        });

        onSubmit({
          source: "link",
          folderPath,
          filename: filename || file.name,
          downloadLink: uploadUrl.split("?")[0],
          isTemporaryUpload: true,
          s3ObjectKey: objectKey,
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <FolderPathDisplay path={folderPath} />

      {isLoading ? (
        <div className="py-4 text-center">Loading volume information...</div>
      ) : error && !file ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert variant="warning" className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Important</AlertTitle>
            <AlertDescription className="text-amber-700">
              Please keep this browser tab open during the upload process.
              Closing the tab or navigating away will cancel the upload.
            </AlertDescription>
          </Alert>

          {file && file.size > 1024 * 1024 * 500 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                You're uploading a large file ({formatBytes(file.size)}). This
                may take some time depending on your internet connection.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Model File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              disabled={isSubmitting}
              accept=".safetensors,.ckpt,.pt,.bin,.pth,.gguf"
            />
          </div>

          {file && (
            <div className="space-y-2">
              <Label htmlFor="filename">Save As</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                disabled={isSubmitting}
              />
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              {uploadStats && (
                <div className="text-muted-foreground text-xs">
                  {formatBytes(uploadStats.uploadedSize)} of{" "}
                  {formatBytes(uploadStats.totalSize)} uploaded
                  {uploadStats.estimatedTime > 0 && (
                    <span>
                      {" "}
                      • {formatTime(uploadStats.estimatedTime)} remaining
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !file || !filename.trim() || !volumeName}
          >
            {isSubmitting ? "Uploading..." : "Upload"}
          </Button>
        </>
      )}
    </div>
  );
}
