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
import { LinkForm } from "./link-form";
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

  const handleSourceSelect = (source: ModelSource) => {
    setSelectedSource(source);
  };

  const handleSubmit = async (request: AddModelRequest) => {
    try {
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
      console.error("Error adding model:", error);

      // Show error toast
      toast.error(
        error instanceof Error ? error.message : "Failed to add model",
      );
    }
  };

  const renderForm = () => {
    switch (selectedSource) {
      case "huggingface":
        return (
          <HuggingfaceForm
            onSubmit={handleSubmit}
            folderPath={initialFolderPath}
          />
        );
      case "civitai":
        return (
          <CivitaiForm onSubmit={handleSubmit} folderPath={initialFolderPath} />
        );
      case "link":
        return (
          <LinkForm onSubmit={handleSubmit} folderPath={initialFolderPath} />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Model</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <SourceSelector
            selected={selectedSource}
            onSelect={handleSourceSelect}
          />
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
