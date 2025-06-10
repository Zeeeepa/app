import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ModelSource, AddModelRequest } from "@/types/models";
import { SourceSelector } from "./source-selector";
import { HuggingfaceForm } from "./huggingface-form";
import { CivitaiForm } from "./civitai-form";
import { ComfyUIForm } from "./comfyui-form";
import { LinkForm } from "./link-form";
import { LocalUploadForm } from "./local-upload-form";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AddModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFolderPath: string;
}

export function AddModelDialog({
  open,
  onOpenChange,
  initialFolderPath,
}: AddModelDialogProps) {
  const [selectedSource, setSelectedSource] = useState<ModelSource | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSourceSelect = (source: ModelSource) => {
    setSelectedSource(source);
  };

  const handleSubmit = async (request: AddModelRequest) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // For local uploads, we don't need to make an API call as the file is already uploaded
      if (request.source === "local") {
        toast.success("Model uploaded successfully");
        onOpenChange(false);
        setIsSubmitting(false);
        return;
      }

      const response = await api({
        url: "volume/model",
        init: {
          method: "POST",
          body: JSON.stringify(request),
        },
      });

      // Show success toast with the message from the API
      toast.success(response.message || "Model added successfully");

      // Close the dialog after successful submission
      onOpenChange(false);
    } catch (error) {
      // Show error toast
      toast.error(
        error instanceof Error ? error.message : "Failed to add model",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => {
    switch (selectedSource) {
      case "huggingface":
        return (
          <HuggingfaceForm
            onSubmit={handleSubmit}
            folderPath={initialFolderPath}
            isSubmitting={isSubmitting}
          />
        );
      case "civitai":
        return (
          <CivitaiForm
            onSubmit={handleSubmit}
            folderPath={initialFolderPath}
            isSubmitting={isSubmitting}
          />
        );
      case "comfyui":
        return (
          <ComfyUIForm
            onSubmit={handleSubmit}
            folderPath={initialFolderPath}
            isSubmitting={isSubmitting}
          />
        );
      case "link":
        return (
          <LinkForm
            onSubmit={handleSubmit}
            folderPath={initialFolderPath}
            isSubmitting={isSubmitting}
          />
        );
      case "local":
        return (
          <LocalUploadForm
            onSubmit={handleSubmit}
            folderPath={initialFolderPath}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing the dialog while submitting
        if (isSubmitting && !newOpen) return;
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Model</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <SourceSelector
            selected={selectedSource}
            onSelect={handleSourceSelect}
            disabled={isSubmitting}
          />
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
