import {
  Check,
  CircleX,
  Clock,
  Download,
  Ellipsis,
  FileAudio,
  FileDown,
  FileText,
  FolderOpen,
  Loader2,
  Minus,
  Search,
  SearchX,
  X,
} from "lucide-react";
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { DownloadButton } from "@/components/download-button";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddAsset } from "@/hooks/hook";
import { useAuthStore } from "@/lib/auth-store";
import { cn, getOptimizedImage } from "@/lib/utils";
import { downloadImage } from "@/utils/download-image";
import { ShineBorder } from "../magicui/shine-border";
import { MoveAssetDialog } from "../move-asset-dialog";
import { CodeBlock } from "../ui/code-blocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// File type management utility
const FILE_TYPES = {
  VIDEO: [".mp4", ".webm", ".mov"],
  AUDIO: [".mp3", ".wav", ".flac", ".opus"],
  MODEL_3D: [".glb", ".gltf", ".obj"],
  TEXT: [".txt", ".json", ".md"],
  IMAGE: [".png", ".gif", ".jpg", ".jpeg", ".webp", ".avif", ".heic", ".heif"],
} as const;

type FileTypeCategory = keyof typeof FILE_TYPES;

const isFileType = (filename: string, category: FileTypeCategory): boolean => {
  const lowercaseFilename = filename.toLowerCase();
  return FILE_TYPES[category].some((ext) => lowercaseFilename.endsWith(ext));
};

const getFileTypeCategory = (filename: string): FileTypeCategory | null => {
  for (const [category] of Object.entries(FILE_TYPES)) {
    if (isFileType(filename, category as FileTypeCategory)) {
      return category as FileTypeCategory;
    }
  }
  return null;
};

// Create a lazy-loaded version of the component
const LazyModelRenderer = lazy(() =>
  import("./3d-renderer").then((module) => ({
    default: module.ModelRendererComponent,
  })),
);

// Fallback loading component for the entire 3D renderer
function LoadingFallback({ mediaClasses }: { mediaClasses?: string }) {
  return (
    <div
      className={cn(
        "flex h-[70vh] w-[70vh] items-center justify-center bg-gray-100/50",
        mediaClasses,
      )}
    >
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    </div>
  );
}

// Export the wrapper component with Suspense
export function ModelRenderer(props: {
  url: string;
  mediaClasses?: string;
  isMainView?: boolean;
  isSmallView?: boolean;
}) {
  return (
    <Suspense fallback={<LoadingFallback mediaClasses={props.mediaClasses} />}>
      <LazyModelRenderer {...props} />
    </Suspense>
  );
}

type fileURLRenderProps = {
  url: string;
  imgClasses?: string;
  lazyLoading?: boolean;
  onLoad?: () => void;
  isMainView?: boolean;
  canFullScreen?: boolean;
  isSmallView?: boolean;
  canDownload?: boolean;
  showFullResolution?: boolean;

  // temp fix
  isAssetBrowser?: boolean;
};

function _FileURLRender({
  url,
  imgClasses: mediaClasses,
  lazyLoading = false,
  onLoad,
  isMainView = false,
  isSmallView = false,
  isAssetBrowser = false,
  showFullResolution = false,
}: fileURLRenderProps) {
  const { token } = useAuthStore();
  const a = new URL(url);
  const filename = a.pathname.split("/").pop();
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setImageError(false);
      setIsLoading(true);
    }
  }, [token]);

  useEffect(() => {
    if (!imageError && !isLoading) {
      onLoad?.();
    }
  }, [imageError, isLoading, onLoad]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  if (!filename) {
    return <div className="bg-slate-300">Not possible to render</div>;
  }

  // Check file type using utility
  const fileTypeCategory = getFileTypeCategory(filename);

  if (fileTypeCategory === "VIDEO") {
    return (
      <div className="relative">
        {isLoading && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-gray-100/50",
              mediaClasses,
            )}
          >
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        <video
          autoPlay
          loop
          muted
          playsInline
          className={cn("w-[500px]", mediaClasses)}
          preload={isSmallView ? "metadata" : "auto"}
          onLoadedData={handleLoad}
        >
          <source src={url} type="video/mp4" />
          <source src={url} type="video/webm" />
          <source src={url} type="video/quicktime" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // For audio files
  if (fileTypeCategory === "AUDIO") {
    if (isSmallView) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <FileAudio className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }

    return (
      <div className="relative">
        {isLoading && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              mediaClasses,
            )}
          >
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        <div
          className={cn("flex w-96 flex-col items-center gap-2", mediaClasses)}
        >
          <audio
            controls
            className="w-full max-w-md"
            preload={isSmallView ? "metadata" : "auto"}
            onLoadedData={handleLoad}
          >
            <source src={url} type="audio/mpeg" />
            <source src={url} type="audio/wav" />
            <source src={url} type="audio/flac" />
            <source src={url} type="audio/opus" />
            <track kind="captions" srcLang="en" label="No captions available" />
            Your browser does not support the audio element.
          </audio>
          <div className="text-muted-foreground text-xs">{filename}</div>
        </div>
      </div>
    );
  }

  // For 3D models, use the separate component
  if (fileTypeCategory === "MODEL_3D") {
    return (
      <ModelRenderer
        url={url}
        mediaClasses={mediaClasses}
        isMainView={isMainView}
        isSmallView={isSmallView}
      />
    );
  }

  // For text-based files
  if (fileTypeCategory === "TEXT") {
    if (isSmallView) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }

    return (
      <TextFileRenderer
        url={url}
        filename={filename}
        mediaClasses={mediaClasses}
      />
    );
  }

  if (fileTypeCategory === "IMAGE") {
    if (imageError) {
      return (
        <div
          className={cn(
            "@container flex aspect-square h-full w-full flex-col items-center justify-center gap-1 text-gray-600 dark:text-gray-400",
            mediaClasses,
          )}
        >
          <SearchX size={20} strokeWidth={1.5} />
          <span className="@4xs:inline hidden text-sm">Not found</span>
        </div>
      );
    }

    return (
      <div className={cn("relative", !isAssetBrowser && "h-full w-full")}>
        {isLoading && (
          <div
            className={cn(
              "absolute inset-0 flex h-full w-full items-center justify-center bg-gray-100/50 [animation:pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite] dark:bg-zinc-700/50",
              mediaClasses,
            )}
          />
        )}
        <img
          onLoad={handleLoad}
          className={cn(mediaClasses, isLoading ? "opacity-0" : "opacity-100")}
          src={
            showFullResolution
              ? url
              : getOptimizedImage(url, isSmallView, token)
          }
          alt={filename}
          loading={lazyLoading ? "lazy" : undefined}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <FileDown
        className={cn(
          isSmallView ? "h-4 w-4" : "h-6 w-6",
          "text-muted-foreground",
        )}
      />
    </div>
  );
}

// New component for text file rendering
function TextFileRenderer({
  url,
  filename,
  mediaClasses,
}: {
  url: string;
  filename: string;
  mediaClasses?: string;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  const fileExtension = filename.split(".").pop()?.toLowerCase();

  if (loading) {
    return (
      <div
        className={cn(
          "flex h-[200px] w-full max-w-[500px] items-center justify-center rounded-md bg-gray-50 p-4 dark:bg-zinc-700",
          mediaClasses,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "w-full max-w-[500px] rounded-md bg-red-50 p-4 dark:bg-red-900/50",
          mediaClasses,
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-red-500">
          <CircleX size={16} />
          <span className="font-medium">Error loading file</span>
        </div>
        <p className="text-red-700 text-sm dark:text-red-400">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.open(url, "_blank")}
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          Download Instead
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "max-h-[400px] w-full max-w-[500px] overflow-auto rounded-md border",
        mediaClasses,
      )}
    >
      <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 dark:bg-zinc-700">
        <span className="max-w-[200px] truncate font-medium text-sm">
          {filename}
        </span>
      </div>
      {fileExtension === "json" ? (
        <CodeBlock
          code={JSON.stringify(JSON.parse(content || "{}"), null, 2)}
          lang="json"
          className="max-h-full text-xs"
          scrollAreaClassName="rounded-none"
        />
      ) : (
        <pre className="whitespace-pre-wrap bg-gray-100 p-4 font-mono text-xs dark:bg-zinc-800">
          {content}
        </pre>
      )}
    </div>
  );
}

export function FileURLRender(props: fileURLRenderProps) {
  const [open, setOpen] = useState(false);

  // Memoize the file type check to avoid recalculation on every render
  const shouldShowDownloadButton = useMemo(() => {
    if (!props.canDownload) return false;
    const filename = new URL(props.url).pathname.split("/").pop();
    return !(filename && isFileType(filename, "AUDIO"));
  }, [props.canDownload, props.url]);

  // Check if file type category is null to apply gray background
  const fileTypeCategory = useMemo(() => {
    const filename = new URL(props.url).pathname.split("/").pop();
    return filename ? getFileTypeCategory(filename) : null;
  }, [props.url]);

  const shouldApplyGrayBackground =
    shouldShowDownloadButton && fileTypeCategory === null;

  return (
    <ErrorBoundary
      fallback={(e) => (
        <div
          className={cn(
            "flex aspect-square h-full w-full max-w-[200px] flex-col items-center justify-center gap-2 px-4 text-gray-600 text-xs",
            props.imgClasses,
          )}
        >
          <SearchX size={20} strokeWidth={1.5} />
          <span>Error rendering: {e.message}</span>
        </div>
      )}
    >
      {props.canFullScreen ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="h-full w-full">
            <_FileURLRender {...props} />
          </DialogTrigger>

          <DialogContent
            className="h-screen max-w-full border-none bg-transparent shadow-none"
            onClick={() => {
              setOpen(false);
            }}
          >
            <DialogTitle className="hidden" />
            <div className="flex h-full w-full items-center justify-center">
              <_FileURLRender
                isAssetBrowser={props.isAssetBrowser}
                url={props.url}
                imgClasses="drop-shadow-md max-w-[90vw] max-h-[90vh] object-contain"
                lazyLoading={props.lazyLoading}
                showFullResolution={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div
          className={cn(
            "group !drop-shadow-none relative",
            shouldApplyGrayBackground &&
              "min-w-[200px] aspect-square bg-gradient-to-br from-zinc-50/90 to-zinc-200/90 dark:from-zinc-700/90 dark:to-zinc-900/90 rounded-md",
            props.imgClasses,
          )}
        >
          <_FileURLRender {...props} />
          {shouldShowDownloadButton && (
            <div className="absolute top-2 right-2">
              <Button
                size="icon"
                className="opacity-0 shadow-md transition-opacity duration-300 group-hover:opacity-100"
                hideLoading
                onClick={async (e) => {
                  e.stopPropagation();
                  await downloadImage({
                    url: props.url,
                    fileName: props.url.split("/").pop(),
                  });
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </ErrorBoundary>
  );
}

function FileURLRenderMulti({
  runId,
  urls,
  imgClasses,
  canExpandToView,
  lazyLoading,
  canDownload,
  columns = 1,
  isMainView = false,
  isSmallView = false,
}: {
  runId?: string;
  urls: {
    url: string;
    upload_duration?: number;
    filename?: string;
    node_meta?: {
      node_class?: string;
      node_id?: string;
    };
  }[];
  imgClasses: string;
  canExpandToView: boolean;
  lazyLoading: boolean;
  canDownload: boolean;
  columns?: number;
  isMainView?: boolean;
  isSmallView?: boolean;
}) {
  if (!canExpandToView) {
    if (columns > 1 && urls.length > 1) {
      return (
        <div className={cn("grid grid-cols-1 gap-2", `grid-cols-${columns}`)}>
          {urls.map((url, i) => (
            <FileURLRender
              key={`${runId || ""}-${url.url}-${i}`}
              url={url.url}
              imgClasses={imgClasses}
              isMainView={isMainView}
              canDownload={canDownload}
              isSmallView={isSmallView}
            />
          ))}
        </div>
      );
    }

    return (
      <>
        {urls.map((url, i) => (
          <FileURLRender
            key={`${runId || ""}-${url.url}-${i}`}
            url={url.url}
            imgClasses={imgClasses}
            isMainView={isMainView}
            canDownload={canDownload}
            isSmallView={isSmallView}
          />
        ))}
      </>
    );
  }

  // Render the image list directly instead of using a nested component
  return (
    <>
      {columns > 1 ? (
        <div className={cn("grid grid-cols-1 gap-2", `grid-cols-${columns}`)}>
          {urls.map((urlImage, i) => {
            return (
              <MediaDisplay
                key={`${runId || ""}-${urlImage.url}-${i}`}
                urlImage={urlImage}
                imgClasses={imgClasses}
                lazyLoading={lazyLoading}
                canDownload={canDownload}
                runId={runId}
              />
            );
          })}
        </div>
      ) : (
        <>
          {urls.map((urlImage, i) => (
            <MediaDisplay
              key={`${runId || ""}-${urlImage.url}-${i}`}
              urlImage={urlImage}
              imgClasses={imgClasses}
              lazyLoading={lazyLoading}
              canDownload={canDownload}
              runId={runId}
            />
          ))}
        </>
      )}
    </>
  );
}

function MediaDisplay({
  urlImage,
  imgClasses,
  lazyLoading,
  canDownload = false,
  runId,
}: {
  urlImage: any;
  imgClasses: string;
  lazyLoading: boolean;
  canDownload: boolean;
  runId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
      <div
        key={`${urlImage.url}-${urlImage.node_meta?.node_id || ""}`}
        className="group relative flex cursor-pointer overflow-clip rounded-[8px]"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Skeleton className={cn("aspect-square min-w-[230px]")} />
        <FileURLRender
          url={urlImage.url}
          imgClasses={cn(
            imgClasses,
            "absolute top-0 left-0 pointer-events-none",
          )}
          lazyLoading={lazyLoading}
        />

        <div className="absolute top-0 right-0 w-full rounded-t-[4px] bg-gradient-to-t from-transparent to-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex items-center justify-end">
            <FileURLRenderDropdown
              itemUrl={urlImage.url}
              itemFilename={urlImage.filename}
              runId={runId}
              outputId={urlImage.output_id}
              outputType={urlImage.output_type}
            />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full rounded-b-[4px] bg-gradient-to-b from-transparent to-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex items-center justify-between px-3 py-2 drop-shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-white/90 text-xs">
                {Math.round(urlImage.upload_duration * 100) / 100}s
              </span>
              {urlImage.filename && (
                <span className="w-28 truncate rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white/90">
                  {urlImage.filename}
                </span>
              )}
            </div>
            <Search className="h-3.5 w-3.5 text-white/90" />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="h-screen max-w-full border-none bg-transparent shadow-none"
          onClick={() => {
            setOpen(false);
          }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <FileURLRender
              url={urlImage.url}
              imgClasses="shadow-md max-w-[90vw] max-h-[90vh] object-contain"
              lazyLoading={lazyLoading}
              showFullResolution={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FileURLRenderDropdown({
  itemUrl,
  triggerIcon,
  open,
  onOpenChange,
  itemFilename,
  canDownload = true,
  canAddToAssets = true,
  runId,
  outputId,
  outputType,
  children,
}: {
  itemUrl: string;
  triggerIcon?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  itemFilename?: string;
  canDownload?: boolean;
  canAddToAssets?: boolean;
  runId?: string;
  outputId?: string;
  outputType?: string;
  children?: ReactNode;
}) {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const { mutate: addAsset } = useAddAsset();

  const handleAddAsset = async ({
    url,
    path,
  }: {
    url: string;
    path: string;
  }) => {
    try {
      await addAsset({ url, path });
      toast.success(`${itemFilename} added to assets`);
      setMoveDialogOpen(false);
    } catch (error) {
      toast.error(`Failed to add asset: ${error}`);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-transparent">
            {triggerIcon || <Ellipsis className="h-3.5 w-3.5 text-white/90" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52" blocking={true}>
          {itemFilename && (
            <>
              <DropdownMenuLabel className="line-clamp-1">
                {itemFilename}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {canDownload && (
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation();
                await downloadImage({
                  url: itemUrl,
                  fileName: itemFilename,
                });
              }}
            >
              <div className="flex w-full items-center justify-between">
                Download <Download className="h-3.5 w-3.5" />
              </div>
            </DropdownMenuItem>
          )}
          {canAddToAssets && (
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                setMoveDialogOpen(true);
              }}
            >
              <div className="flex w-full items-center justify-between">
                Add to assets <FolderOpen className="h-3.5 w-3.5" />
              </div>
            </DropdownMenuItem>
          )}
          {/* {runId && outputId && (
            <DropdownMenuItem
              onClick={async (event) => {
                event.stopPropagation();
                if (shareLoading) return;
                setShareLoading(true);
                try {
                  const data = await api({
                    url: "share/output",
                    init: {
                      method: "POST",
                      body: JSON.stringify({
                        run_id: runId,
                        output_id: outputId,
                        output_type: outputType ?? "other",
                        visibility: "private",
                      }),
                    },
                  });
                  const isLocal = process.env.NODE_ENV === "development";
                  const shareUrl = isLocal
                    ? `${process.env.NEXT_PUBLIC_CD_API_URL}/api/share/output/${data.id}`
                    : `/api/share/output/${data.id}`;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Share link copied to clipboard!");
                  } catch (err) {
                    console.error("Clipboard copy failed", err);
                    toast.error("Share link created, but failed to copy");
                  }
                } catch (err) {
                  console.error("Failed to create share link", err);
                  toast.error("Failed to create share link");
                } finally {
                  setShareLoading(false);
                }
              }}
            >
              <div className="flex w-full items-center justify-between">
                Share
                {shareLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share className="h-3.5 w-3.5" />
                )}
              </div>
            </DropdownMenuItem>
          )} */}
          {children && (
            <>
              {(canDownload || canAddToAssets) && <DropdownMenuSeparator />}
              {children}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <MoveAssetDialog
        asset={{
          id: "temp",
          name: itemFilename || "New Asset",
          path: "/",
          is_folder: false,
          file_size: 0,
          mime_type: "",
          created_at: new Date().toISOString(),
          user_id: "",
        }}
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onConfirm={(path) => handleAddAsset({ url: itemUrl, path })}
        dialogTitle="Add to Assets"
        dialogDescription="Select a destination folder for the asset"
        confirmText="Add Here"
        isAddAsset={true}
      />
    </>
  );
}

export function getTotalUrlCountAndUrls(outputs: any[], runId?: string) {
  const urls: any[] = [];
  const total: number =
    outputs?.reduce((total, output) => {
      const outputId = output.output_id ?? output.id;
      const outputType = output.output_type ?? output.file_type;
      const files = [
        ...(output.data.images?.map((image: any) => ({
          ...image,
          node_meta: output.node_meta,
          output_id: outputId,
          output_type: outputType,
          run_id: runId,
        })) || []),
        ...(output.data.files?.map((file: any) => ({
          ...file,
          node_meta: output.node_meta,
          output_id: outputId,
          output_type: outputType,
          run_id: runId,
        })) || []),
        ...(output.data.gifs?.map((gif: any) => ({
          ...gif,
          node_meta: output.node_meta,
          output_id: outputId,
          output_type: outputType,
          run_id: runId,
        })) || []),
        ...(output.data.model_files?.map((model_file: any) => ({
          ...model_file,
          node_meta: output.node_meta,
          output_id: outputId,
          output_type: outputType,
          run_id: runId,
        })) || []),
      ];
      urls.push(...files);
      return total + files.length;
    }, 0) || 0;
  return { total, urls };
}

/**
 * Renders multiple file URLs, optionally allowing for expandable views and downloads.
 * @param {any} run - insert the run here.
 * @param {string} imgClasses - tailwind class for each image style.
 * @param {boolean} canExpandToView - If true, allows images to be expanded in a dialog.
 * @param {boolean} lazyLoading - If true, images will be lazy loaded.
 * @param {boolean} canDownload - If true, displays a download button for each image.
 * @param {number} displayCount - Number of images to display, if not set, all images will be displayed.
 * @returns {JSX.Element} imageRender - Component display all images.
 */
export function OutputRenderRun({
  run,
  imgClasses,
  lazyLoading = false,
  canExpandToView = false,
  canDownload = false,
  columns = 1,
  displayCount,
  showNullSkeleton = false,
  isMainView = false,
}: {
  run: any;
  imgClasses: string;
  lazyLoading?: boolean;
  canExpandToView?: boolean;
  canDownload?: boolean;
  displayCount?: number;
  columns?: number;
  showNullSkeleton?: boolean;
  isMainView?: boolean;
}) {
  const { total: totalUrlCount, urls: urlList } = getTotalUrlCountAndUrls(
    run.outputs || [],
    run.id,
  );

  const urlsToDisplay =
    displayCount && urlList.length > 0
      ? urlList.slice(0, displayCount)
      : urlList;

  if (showNullSkeleton && urlList.length === 0) {
    return (
      <div className="relative">
        <Skeleton className={imgClasses} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">No outputs</span>
        </div>
      </div>
    );
  }

  return (
    <FileURLRenderMulti
      runId={run.id}
      urls={urlsToDisplay}
      imgClasses={imgClasses}
      canExpandToView={canExpandToView}
      lazyLoading={lazyLoading}
      canDownload={canDownload}
      columns={columns}
      isMainView={isMainView}
    />
  );
}

// Add this new component for status indicators
function RunStatusIndicator({ status }: { status: string }) {
  if (!status) return null;

  let StatusIcon: any;
  let iconClassName: string;
  let extraClassName: string;

  switch (status) {
    case "success":
      StatusIcon = Check;
      iconClassName = "text-green-500";
      extraClassName = "shadow-md";
      break;
    case "failed":
      StatusIcon = X;
      iconClassName = "text-red-500";
      extraClassName = "";
      break;
    case "cancelled":
      StatusIcon = Minus;
      iconClassName = "text-gray-200";
      extraClassName = "";
      break;
    case "timeout":
      StatusIcon = Clock;
      iconClassName = "text-amber-500";
      extraClassName = "";
      break;
    case "running":
    case "uploading":
    case "not-started":
    case "queued":
      StatusIcon = Loader2;
      iconClassName = "text-gray-200 animate-spin";
      extraClassName = "";
      break;
    default:
      return null;
  }

  return (
    <div
      className={cn(
        "absolute right-1.5 bottom-1.5 z-10 rounded-[6px] bg-black/50 p-1 backdrop-blur-md",
        extraClassName,
      )}
    >
      <StatusIcon size={12} className={iconClassName} />
    </div>
  );
}

export function PlaygroundOutputRenderRun({
  run,
  imgClasses,
  isSelected = false,
  isSharePage = false,
}: {
  run: any;
  imgClasses: string;
  isSelected?: boolean;
  isSharePage?: boolean;
}) {
  const { urls: urlList } = getTotalUrlCountAndUrls(run.outputs || [], run.id);
  const urlsToDisplay = urlList.length > 0 ? urlList.slice(0, 1) : [];

  return (
    <div
      className={cn(
        "relative h-full transition-transform",
        isSelected
          ? "-translate-x-1 hover:-translate-x-1.5"
          : !isSharePage && "hover:-translate-x-1",
      )}
    >
      <RunStatusIndicator status={run.status} />
      {/* Add image count indicator when there are multiple images */}
      {urlList.length > 1 && (
        <div className="absolute top-1.5 right-1.5 z-10 rounded-[8px] bg-black/70 px-1.5 font-medium text-2xs text-white">
          +{urlList.length}
        </div>
      )}

      {isSelected && (
        <div
          className="group absolute top-0 left-0 z-20 flex h-full w-full items-center justify-center rounded-[8px] hover:bg-black/20 hover:backdrop-blur-sm"
          title="deselect"
        >
          <CircleX className="text-gray-200 opacity-0 transition-opacity group-hover:opacity-100" />
          <ShineBorder
            color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
            className="!min-w-[108px] h-full bg-transparent"
            borderWidth={4}
          />
        </div>
      )}

      {urlsToDisplay.length > 0 ? (
        <>
          <FileURLRenderMulti
            runId={run.id}
            urls={urlsToDisplay}
            imgClasses={imgClasses}
            canExpandToView={false}
            lazyLoading={true}
            canDownload={false}
            columns={1}
            isMainView={false}
            isSmallView={true}
          />
          <div className="absolute right-0 bottom-0 left-0 h-8 w-fulll shrink-0 rounded-b-[6px] bg-gradient-to-t from-black/50 to-transparent" />
        </>
      ) : (
        <>
          <Skeleton
            className={cn(
              imgClasses,
              run.status === "failed" && "bg-red-500/20",
            )}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-[10px] text-muted-foreground",
                run.status === "cancelled" && "line-through",
                run.status === "failed" && "text-red-500",
              )}
            >
              {run.status === "cancelled"
                ? "Cancelled"
                : run.status === "failed"
                  ? "Failed"
                  : run.status === "running" ||
                      run.status === "uploading" ||
                      run.status === "not-started" ||
                      run.status === "queued"
                    ? "Generating"
                    : "No outputs"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function OutputRender({ fileUrl }: { fileUrl: string }) {
  if (!fileUrl) return <></>;

  return <FileURLRender url={fileUrl} />;
}
