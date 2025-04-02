import { Link, Upload } from "lucide-react";
import type { ModelSource, ModelSourceOption } from "@/types/models";
import { cn } from "@/lib/utils";

const sources: ModelSourceOption[] = [
  {
    id: "huggingface",
    label: "Hugging Face repo",
    icon: () => (
      <img
        src="/huggingface.svg"
        alt="Hugging Face"
        width={32}
        height={32}
        className="text-foreground"
      />
    ),
  },
  {
    id: "civitai",
    label: "CivitAI",
    icon: () => <img src="/civitai.svg" alt="CivitAI" width={32} height={32} />,
  },
  {
    id: "link",
    label: "URL",
    icon: Link,
  },
  {
    id: "local",
    label: "Local File",
    icon: Upload,
  },
];

interface SourceSelectorProps {
  selected: ModelSource | null;
  onSelect: (source: ModelSource) => void;
  disabled?: boolean;
}

export function SourceSelector({
  selected,
  onSelect,
  disabled,
}: SourceSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {sources.map((source) => {
        const Icon = source.icon;
        return (
          <button
            type="button"
            key={source.id}
            onClick={() => onSelect(source.id)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border p-6 transition-colors hover:bg-accent",
              selected === source.id && "border-primary bg-accent",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Icon className="h-8 w-8" />
            <span className="font-medium text-base">{source.label}</span>
          </button>
        );
      })}
    </div>
  );
}
