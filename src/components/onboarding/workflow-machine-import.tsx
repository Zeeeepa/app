import { InsertModal } from "@/components/auto-form/auto-form-dialog";
import {
  serverlessFormSchema,
  sharedMachineConfig,
} from "@/components/machine/machine-schema";
import { CustomNodeList } from "@/components/machines/custom-node-list";
import { analyzeWorkflowJson } from "@/components/onboarding/workflow-analyze";
import {
  AccordionOption,
  type StepValidation,
} from "@/components/onboarding/workflow-import";
import {
  type SnapshotImportData,
  SnapshotImportZoneLite,
} from "@/components/snapshot-import-zone";
import type { StepComponentProps } from "@/components/step-form";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VirtualizedInfiniteList } from "@/components/virtualized-infinite-list";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import {
  getBranchInfo,
  useGithubBranchInfo,
} from "@/hooks/use-github-branch-info";
import { useMachines } from "@/hooks/use-machine";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { comfyui_hash } from "@/utils/comfydeploy-hash";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Lock,
  Pencil,
  Search,
  Settings2,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

// Add this type
export type ComfyUIOption = {
  id: "recommended" | "latest" | "custom";
  name: string;
  hash: string | null;
};

export type GpuTypes =
  | "CPU"
  | "T4"
  | "A10G"
  | "L4"
  | "A100"
  | "A100-80GB"
  | "H100";

type GpuOption = {
  id: GpuTypes;
  name: string;
  ram?: string;
  description: {
    bold: string;
    regular: string;
  };
  isForFreePlan: boolean;
  isHidden: boolean;
};

export const gpuOptions: GpuOption[] = [
  {
    id: "CPU",
    name: "CPU",
    isForFreePlan: true,
    description: {
      bold: "CPU",
      regular: "",
    },
    isHidden: true,
  },
  {
    id: "T4",
    name: "T4",
    ram: "16GB",
    description: {
      bold: "Entry-level GPU.",
      regular: "Perfect for basic inference and development",
    },
    isForFreePlan: true,
    isHidden: false,
  },
  {
    id: "A10G",
    name: "A10G",
    ram: "24GB",
    description: {
      bold: "Balanced performance.",
      regular: "Best for production workloads and training",
    },
    isForFreePlan: true,
    isHidden: false,
  },
  {
    id: "L4",
    name: "L4",
    ram: "24GB",
    description: {
      bold: "L4",
      regular: "",
    },
    isForFreePlan: true,
    isHidden: true,
  },
  {
    id: "A100",
    name: "A100",
    ram: "40GB",
    description: {
      bold: "Ultimate performance.",
      regular: "Best for large-scale AI training and inference",
    },
    isForFreePlan: false,
    isHidden: false,
  },
  {
    id: "A100-80GB",
    name: "A100-80GB",
    ram: "80GB",
    description: {
      bold: "A100-80GB",
      regular: "",
    },
    isForFreePlan: false,
    isHidden: true,
  },
  {
    id: "H100",
    name: "H100",
    ram: "80GB",
    description: {
      bold: "H100",
      regular: "",
    },
    isForFreePlan: false,
    isHidden: true,
  },
];

// Helper type for node metadata
type NodeMeta = {
  message: string;
  committer: {
    date: string;
    name: string;
    email: string;
  };
  commit_url: string;
  latest_hash: string;
  stargazers_count: number;
};

// Helper type for node data
type NodeData = {
  name: string;
  hash?: string;
  url: string;
  pip?: string[];
  meta?: NodeMeta;
};

// Helper function to get unique URLs map
function mergeCustomNodes(
  customNodes: Record<string, any> = {},
  selectedConflictingNodes: Record<string, any[]> = {},
): Map<string, NodeData> {
  const uniqueUrls = new Map<string, NodeData>();

  // Add custom nodes first
  for (const [url, node] of Object.entries(customNodes)) {
    const lowerUrl = url.toLowerCase();
    uniqueUrls.set(lowerUrl, {
      name: node.name,
      hash: node.hash || undefined,
      url: url,
      pip: node.pip || undefined,
      meta: node.meta || undefined,
    });
  }

  // Add selected conflicting nodes, only if URL isn't already present
  for (const nodes of Object.values(selectedConflictingNodes)) {
    for (const node of nodes) {
      const lowerUrl = node.url.toLowerCase();
      if (!uniqueUrls.has(lowerUrl)) {
        uniqueUrls.set(lowerUrl, {
          name: node.name,
          hash: node.hash || undefined,
          url: node.url,
          pip: node.pip || undefined,
          meta: node.meta || undefined,
        });
      }
    }
  }

  return uniqueUrls;
}

// Add this function outside of any component
export function convertToDockerSteps(
  customNodes: Record<string, any> = {},
  selectedConflictingNodes: Record<string, any[]> = {},
): any {
  // Get unique URLs using helper function
  const uniqueUrls = mergeCustomNodes(customNodes, selectedConflictingNodes);

  // Convert to steps format
  return {
    steps: Array.from(uniqueUrls.values()).map((node) => ({
      id: crypto.randomUUID().slice(0, 10),
      type: "custom-node" as const,
      data: {
        name: node.name,
        hash: node.hash,
        url: node.url,
        files: [node.url],
        install_type: "git-clone" as const,
        pip: node.pip,
        meta: node.meta,
      },
    })),
  };
}

export function WorkflowImportMachine({
  validation,
  setValidation,
}: StepComponentProps<StepValidation>) {
  const sub = useCurrentPlan();

  return (
    <div>
      <div className="mb-2">
        <span className="font-medium text-sm">Choose an option </span>
        <span className="text-red-500">*</span>
      </div>

      <Accordion
        type="single"
        className="flex w-full flex-col gap-2"
        defaultValue="existing"
        value={validation.machineOption}
        onValueChange={(value) =>
          setValidation({
            ...validation,
            machineOption: value as "existing" | "new",
            selectedMachineId:
              value === "existing" ? validation.selectedMachineId : "",
          })
        }
      >
        <AccordionOption
          value="existing"
          selected={validation.machineOption}
          label="Existing Machine"
          content={
            <div className="flex flex-col gap-4">
              <span className="text-muted-foreground">
                Non-existing custom nodes will be added to the machine.
              </span>
              <ExistingMachine
                validation={validation}
                setValidation={setValidation}
              />
            </div>
          }
        />

        <AccordionOption
          value="new"
          selected={validation.machineOption}
          label={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1">
                  <span className="mr-1">New Machine</span>
                  {sub?.features.machineLimited && <Lock className="h-3 w-3" />}
                </TooltipTrigger>
                {sub?.features.machineLimited && (
                  <TooltipContent side="right">
                    <p>
                      You reached the limit of creating machines. Upgrade to
                      create more.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          }
          disabled={sub?.features.machineLimited}
          content={
            <div>
              <span className="text-muted-foreground">
                Create and configure a new machine for this workflow.
              </span>
            </div>
          }
        />
      </Accordion>
    </div>
  );
}

function ExistingMachine({
  validation,
  setValidation,
}: StepComponentProps<StepValidation>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchValue] = useDebounce(searchTerm, 250);
  const query = useMachines(debouncedSearchValue);

  useEffect(() => {
    query.refetch();
  }, [debouncedSearchValue]);

  // Helper function to compare nodes
  const compareNodes = (
    machineDockerSteps: any,
    validation: StepValidation,
  ) => {
    const matchingNodes: string[] = [];
    const missingNodes: string[] = [];
    const machineNodeUrls = machineDockerSteps?.steps?.map((node) =>
      node?.data?.url?.toLowerCase(),
    );

    const uniqueUrls = mergeCustomNodes(
      validation.dependencies?.custom_nodes,
      validation.selectedConflictingNodes,
    );

    for (const url of uniqueUrls.keys()) {
      const isMatched = machineNodeUrls.some(
        (mnUrl: string) => mnUrl === url.toLowerCase(),
      );
      if (isMatched) {
        matchingNodes.push(url);
      } else {
        missingNodes.push(url);
      }
    }

    return {
      matchingCount: matchingNodes.length,
      totalRequired: uniqueUrls.size,
      missingNodes,
    };
  };

  if (query.isLoading) {
    return (
      <div>
        {[...Array(5)].map((_, index) => (
          <div
            className={cn(
              "flex items-center space-x-4 border-gray-200 border-r border-b border-l p-2.5",
              index === 4 && "rounded-b-[8px]",
              index === 0 && "rounded-t-[8px] border-t",
            )}
            key={index}
          >
            <Checkbox className="rounded-[4px] border-gray-500" />
            <Skeleton className="h-6 w-[200px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <VirtualizedInfiniteList
        queryResult={query}
        renderItem={(item, index) => {
          const isSelected = validation.selectedMachineId === item.id;
          const nodeComparison = compareNodes(
            item.docker_command_steps,
            validation,
          );

          return (
            <div
              className={cn(
                "flex h-[72px] flex-col items-center justify-center border-gray-200 border-r border-b border-l p-2.5",
                index === 0 && "rounded-t-[8px] border-t",
              )}
            >
              <div className="group flex w-full items-center gap-3">
                <Checkbox
                  id={item.id}
                  className="data-[state=checked]:!bg-primary rounded-[4px] border-gray-500 group-hover:bg-gray-100"
                  checked={isSelected}
                  onCheckedChange={(checked: boolean) => {
                    setValidation({
                      ...validation,
                      selectedMachineId: checked ? item.id : "",
                    });
                  }}
                />
                <label
                  htmlFor={item.id}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <span className="flex-1 truncate whitespace-nowrap">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="!text-[11px] font-mono"
                    >
                      {item.gpu}
                    </Badge>
                    <Badge
                      variant={
                        nodeComparison.missingNodes.length === 0
                          ? "success"
                          : "yellow"
                      }
                      className="!text-[11px]"
                    >
                      {nodeComparison.matchingCount}/
                      {nodeComparison.totalRequired} nodes
                    </Badge>
                  </div>
                </label>

                {nodeComparison.missingNodes.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-yellow-500">
                          <Settings2 className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">Missing Custom Nodes:</p>
                        <ul className="text-xs">
                          {nodeComparison.missingNodes.map((url, i) => (
                            <li key={i} className="text-muted-foreground">
                              • {url.split("/").pop()}
                            </li>
                          ))}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <Link
                  href={`/machines/${item.id}`}
                  target="_blank"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-gray-600"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <CustomNodeList machine={item} />
            </div>
          );
        }}
        estimateSize={72}
        renderLoading={() => {
          return (
            <>
              {[...Array(4)].map((_, index) => (
                <div
                  className={cn(
                    "flex items-center space-x-4 border-gray-200 border-r border-b border-l p-2.5",
                    index === 3 && "rounded-b-[8px]",
                  )}
                  key={index}
                >
                  <Checkbox className="rounded-[4px] border-gray-500" />
                  <Skeleton className="h-6 w-[200px]" />
                </div>
              ))}
            </>
          );
        }}
      />
    </div>
  );
}

export function WorkflowImportNewMachineSetup({
  validation,
  setValidation,
}: StepComponentProps<StepValidation>) {
  const { data: latestComfyUI, isLoading } = useGithubBranchInfo(
    "https://github.com/comfyanonymous/ComfyUI",
  );
  const sub = useCurrentPlan();

  const comfyUIOptions: ComfyUIOption[] = [
    {
      id: "recommended",
      name: "Recommended",
      hash: comfyui_hash,
    },
    {
      id: "latest",
      name: "Latest",
      hash: latestComfyUI?.commit.sha || null,
    },
    {
      id: "custom",
      name: "Custom",
      hash: null,
    },
  ];

  const [showAllGpu, setShowAllGpu] = useState(false);

  const visibleGpus = gpuOptions.filter((gpu) => {
    if (validation.firstTimeSelectGPU && validation.gpuType && !showAllGpu) {
      return gpu.id === validation.gpuType;
    }
    return showAllGpu || !gpu.isHidden;
  });

  return (
    <div className="relative flex flex-col gap-4">
      <AdvanceSettings validation={validation} setValidation={setValidation} />
      <div>
        <div className="mb-2">
          <span className="font-medium text-sm">Machine Name </span>
          <span className="text-red-500">*</span>
        </div>
        <Input
          placeholder="Machine name..."
          value={validation.machineName}
          onChange={(e) =>
            setValidation({ ...validation, machineName: e.target.value })
          }
        />
      </div>

      <div>
        <div className="mb-2">
          <span className="font-medium text-sm">GPU </span>
          <span className="text-red-500">*</span>
        </div>
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {visibleGpus.map((gpu) => (
              <motion.div
                key={gpu.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  onClick={() => {
                    if (!sub?.plans?.plans && !gpu.isForFreePlan) {
                      return;
                    }
                    setValidation({
                      ...validation,
                      gpuType: gpu.id,
                      firstTimeSelectGPU: true,
                    });
                    setShowAllGpu(false); // Collapse after selection
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border p-4 transition-all duration-200",
                    "hover:border-gray-400",
                    validation.gpuType === gpu.id
                      ? "border-gray-500 ring-2 ring-gray-500 ring-offset-2"
                      : "border-gray-200 opacity-60",
                    !sub?.plans?.plans &&
                      !gpu.isForFreePlan &&
                      "cursor-not-allowed",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex flex-row items-center gap-1 font-medium">
                      {gpu.name}
                      {!sub?.plans?.plans && !gpu.isForFreePlan && (
                        <Lock className="h-3 w-3" />
                      )}
                    </span>
                    <span className="text-gray-600 text-sm">{gpu.ram}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="max-w-[70%] text-[11px] text-gray-400">
                      <span className="font-medium text-gray-600">
                        {gpu.description.bold}
                      </span>{" "}
                      {gpu.description.regular}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Show/Hide button - show it always */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="ghost"
              className="mt-2 w-full text-muted-foreground text-xs hover:text-primary"
              onClick={() => setShowAllGpu(!showAllGpu)}
            >
              <div className="flex items-center gap-2">
                {showAllGpu ? (
                  <>
                    Show Less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    {validation.gpuType ? (
                      <>Change GPU Selection</>
                    ) : (
                      <>Show More Options</>
                    )}{" "}
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </div>
            </Button>
          </motion.div>
        </div>
      </div>

      <div>
        <div className="mb-2">
          <span className="font-medium text-sm">ComfyUI Version </span>
          <span className="text-red-500">*</span>
        </div>
        <div className="flex flex-col gap-2">
          {comfyUIOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => {
                setValidation({
                  ...validation,
                  selectedComfyOption: option.id,
                  comfyUiHash:
                    option.id === "custom"
                      ? validation.comfyUiHash
                      : option.hash || "",
                });
              }}
              className={cn(
                "cursor-pointer rounded-lg border p-4 transition-all duration-200",
                "hover:border-gray-400",
                validation.selectedComfyOption === option.id
                  ? "border-gray-500 ring-2 ring-gray-500 ring-offset-2"
                  : "border-gray-200 opacity-60",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">{option.name}</span>
                {option.id !== "custom" && (
                  <Link
                    href={`https://github.com/comfyanonymous/ComfyUI/commits/${option.hash}`}
                    target="_blank"
                    className="text-muted-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-between">
                {option.id === "custom" ? (
                  <Input
                    className="w-full font-mono text-[11px]"
                    placeholder="Enter commit hash..."
                    value={validation.comfyUiHash || ""}
                    onChange={(e) => {
                      setValidation({
                        ...validation,
                        selectedComfyOption: "custom",
                        comfyUiHash: e.target.value,
                      });
                    }}
                  />
                ) : (
                  <span className="text-[11px] text-gray-400">
                    {option.id === "latest" && isLoading ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <span className="font-mono">{option.hash}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkflowImportCustomNodeSetup({
  validation,
  setValidation,
}: StepComponentProps<StepValidation>) {
  const [showAll, setShowAll] = useState(false);

  const json =
    validation.importOption === "default"
      ? validation.workflowJson
      : validation.importJson;

  const {
    data: dependencies,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analyzeWorkflowJson", json],
    queryFn: () => (json ? analyzeWorkflowJson(json) : null),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    enabled: !!json,
  });

  // Helper function to fetch branch info and format result
  async function fetchNodeInfo(url: string, isLoading: boolean, error: any) {
    const branchInfo = await getBranchInfo(url);

    if (isLoading) return { url, hash: null };
    if (error) {
      console.error(`Failed to fetch hash for ${url}:`, error);
      return { url, hash: null };
    }

    return {
      url,
      hash: branchInfo?.commit.sha || null,
      meta: branchInfo && {
        message: branchInfo.commit.commit.message,
        committer: branchInfo.commit.commit.committer,
        latest_hash: branchInfo.commit.sha,
        stargazers_count: branchInfo.stargazers_count,
        commit_url: branchInfo.commit.html_url,
      },
    };
  }

  // Helper function to update node with hash info
  function updateNodeWithHash(node: any, hashInfo: any) {
    if (!hashInfo.hash) return node;

    return {
      ...node,
      hash: hashInfo.hash,
      meta: hashInfo.meta,
      warning: "No hash found in snapshot, using latest commit hash",
    };
  }

  useEffect(() => {
    if (dependencies) {
      const initializeHashes = async () => {
        // First, ensure dependencies are in validation
        if (!validation.dependencies) {
          setValidation({ ...validation, dependencies });
          return;
        }

        const updatedDependencies = { ...validation.dependencies };

        // Handle custom nodes that need hashes
        const nodesNeedBranchInfo = Object.entries(
          updatedDependencies.custom_nodes || {},
        ).filter(([_, node]) => node.meta === undefined);

        if (nodesNeedBranchInfo.length > 0) {
          const results = await Promise.all(
            nodesNeedBranchInfo.map(([url]) =>
              fetchNodeInfo(url, isLoading, error),
            ),
          );

          for (const hashInfo of results) {
            if (hashInfo.hash) {
              updatedDependencies.custom_nodes[hashInfo.url] =
                updateNodeWithHash(
                  updatedDependencies.custom_nodes[hashInfo.url],
                  hashInfo,
                );
            }
          }
        }

        // Check conflicting nodes that need hashes
        const conflictingNodesNeedingHash = Object.values(
          updatedDependencies.conflicting_nodes || {},
        ).flatMap((conflicts) =>
          conflicts.filter((node) => node.hash === null),
        );

        if (conflictingNodesNeedingHash.length > 0) {
          const conflictResults = await Promise.all(
            conflictingNodesNeedingHash.map((node) =>
              fetchNodeInfo(node.url, isLoading, error),
            ),
          );

          // Update only the nodes that needed hashes
          for (const [nodeName, conflicts] of Object.entries(
            updatedDependencies.conflicting_nodes || {},
          )) {
            updatedDependencies.conflicting_nodes[nodeName] = conflicts.map(
              (node) => {
                if (node.hash !== null) return node; // Skip if already has hash
                const hashInfo = conflictResults.find(
                  (r) => r.url === node.url,
                );
                return hashInfo ? updateNodeWithHash(node, hashInfo) : node;
              },
            );
          }
        }

        // Only update validation if any changes were made
        if (
          nodesNeedBranchInfo.length > 0 ||
          conflictingNodesNeedingHash.length > 0
        ) {
          setValidation({ ...validation, dependencies: updatedDependencies });
        }
      };

      initializeHashes();
    }
  }, [dependencies, validation.dependencies]);

  const description = (
    <div className="space-y-1">
      {/* Add a container with controlled spacing */}
    </div>
  );

  const PREVIEW_COUNT = 2;

  const duplicateNode = findFirstDuplicateNode(
    validation.dependencies?.custom_nodes,
    validation.selectedConflictingNodes,
  );

  const isUrlDuplicate = (url: string) => {
    if (!duplicateNode) return false;
    return (
      url.toLowerCase() === duplicateNode.url.toLowerCase() ||
      url.toLowerCase() === duplicateNode.conflictWith.url.toLowerCase()
    );
  };

  if (isLoading) {
    return (
      <>
        {description}
        <div className="mt-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {description}
        <div className="mt-4 text-red-500 text-xs">
          Error loading dependencies. Please try again. <br />
          <span className="text-2xs text-gray-400">{error.message}</span>
        </div>
      </>
    );
  }

  if (!validation.dependencies?.custom_nodes) {
    return (
      <>
        {description}
        <div className="mt-4 flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Updating dependencies' hashes...
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {description}
      <SnapshotImportZoneLite
        onSnapshotImport={(data: SnapshotImportData) => {
          setValidation((prevValidation: StepValidation) => {
            const updates: Partial<StepValidation> = {};
            const updatedNodes: string[] = [];

            // Update ComfyUI hash
            if (data.comfyui) {
              updates.comfyUiHash = data.comfyui;
              updates.selectedComfyOption = "custom";
              toast.success(`Updated ComfyUI version to ${data.comfyui}`);
            }

            // Update custom nodes
            if (
              prevValidation.dependencies?.custom_nodes &&
              data.git_custom_nodes
            ) {
              const updatedDependencies = { ...prevValidation.dependencies };

              for (const [url, nodeInfo] of Object.entries(
                data.git_custom_nodes,
              )) {
                const matchingNodeEntry = Object.entries(
                  updatedDependencies.custom_nodes,
                ).find(
                  ([depUrl]) => depUrl.toLowerCase() === url.toLowerCase(),
                );

                if (matchingNodeEntry) {
                  const [depUrl, nodeData] = matchingNodeEntry;
                  updatedDependencies.custom_nodes[depUrl] = {
                    ...nodeData,
                    hash: nodeInfo.hash,
                  };
                  updatedNodes.push(nodeData.name || depUrl);
                }
              }

              updates.dependencies = updatedDependencies;
              if (updatedNodes.length > 0) {
                toast.success(
                  `Updated ${updatedNodes.length} custom node${
                    updatedNodes.length > 1 ? "s" : ""
                  }: ${updatedNodes.join(", ")}`,
                );
              }
            }

            return { ...prevValidation, ...updates };
          });
        }}
        className="p-4 pt-0"
      >
        <div className="space-y-1">
          <div className="flex flex-row items-center gap-1">
            <span className="bold font-medium text-md">Custom Nodes</span>
            <span className="text-muted-foreground text-sm">
              ({Object.keys(validation.dependencies?.custom_nodes || {}).length}
              )
            </span>
          </div>

          {Object.entries(validation.dependencies?.custom_nodes || {})
            .slice(0, showAll ? undefined : PREVIEW_COUNT)
            .map(([url, node]) => {
              const author = url.split("/")[3];
              return (
                <div key={url} className="space-y-2">
                  <NodeListItem
                    name={node.name}
                    author={author}
                    url={url}
                    starCount={node.meta?.stargazers_count}
                    hasHash={!!node.hash}
                    isUrlDuplicate={isUrlDuplicate(url)}
                  />
                </div>
              );
            })}

          <ShowMoreButton
            showAll={showAll}
            setShowAll={setShowAll}
            totalCount={
              Object.keys(validation.dependencies?.custom_nodes || {}).length
            }
            previewCount={PREVIEW_COUNT}
          />
        </div>

        {validation.dependencies?.conflicting_nodes &&
          Object.keys(validation.dependencies?.conflicting_nodes).length >
            0 && (
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <h3 className="bold font-medium text-md">
                    Conflicting Nodes
                  </h3>
                  <span className="text-sm text-yellow-600">
                    (
                    {
                      Object.keys(
                        validation.dependencies?.conflicting_nodes || {},
                      ).length
                    }
                    )
                  </span>
                </div>
                <span className="block text-muted-foreground text-sm leading-normal">
                  Multiple repos found with the same node name.
                </span>
              </div>

              {Object.entries(
                validation.dependencies?.conflicting_nodes || {},
              ).map(([nodeName, conflicts]) => (
                <div key={nodeName} className="rounded-sm border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium text-sm">{nodeName}</span>
                    <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs text-yellow-600">
                      {conflicts.length} implementation
                      {conflicts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {conflicts.map((conflict, index) => {
                      const author = conflict.url.split("/")[3];
                      return (
                        <NodeListItem
                          key={conflict.url}
                          name={conflict.name}
                          author={author}
                          url={conflict.url}
                          starCount={conflict.meta?.stargazers_count}
                          hasHash={!!conflict.hash}
                          isUrlDuplicate={isUrlDuplicate(conflict.url)}
                          checkbox={
                            <Checkbox
                              id={`${nodeName}-${index}`}
                              className="data-[state=checked]:!bg-primary rounded-[4px] border-gray-500 group-hover:bg-gray-100"
                              checked={validation.selectedConflictingNodes?.[
                                nodeName
                              ]?.some((node) => node.url === conflict.url)}
                              onCheckedChange={(checked: boolean) => {
                                setValidation((prev) => {
                                  const newSelectedNodes = {
                                    ...prev.selectedConflictingNodes,
                                  };
                                  // Find all node names that have this same URL
                                  for (const [
                                    currentNodeName,
                                    conflicts,
                                  ] of Object.entries(
                                    validation.dependencies
                                      ?.conflicting_nodes || {},
                                  )) {
                                    const matchingConflict = conflicts.find(
                                      (c) =>
                                        c.url.toLowerCase() ===
                                        conflict.url.toLowerCase(),
                                    );

                                    if (matchingConflict) {
                                      if (checked) {
                                        // Add this implementation to all relevant nodes
                                        newSelectedNodes[currentNodeName] = [
                                          ...(newSelectedNodes[
                                            currentNodeName
                                          ] || []),
                                          matchingConflict,
                                        ];
                                      } else {
                                        // Remove this implementation from all relevant nodes
                                        newSelectedNodes[currentNodeName] = (
                                          newSelectedNodes[currentNodeName] ||
                                          []
                                        ).filter(
                                          (node) =>
                                            node.url.toLowerCase() !==
                                            conflict.url.toLowerCase(),
                                        );
                                      }
                                    }
                                  }

                                  return {
                                    ...prev,
                                    selectedConflictingNodes: newSelectedNodes,
                                  };
                                });
                              }}
                            />
                          }
                        />
                      );
                    })}
                  </div>

                  {conflicts.length === 0 && (
                    <div className="text-muted-foreground text-xs">
                      Node type "{nodeName}" is missing but no known
                      implementations found.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </SnapshotImportZoneLite>
    </div>
  );
}

function AdvanceSettings({ validation }: StepComponentProps<StepValidation>) {
  const [openAdvanceSettings, setOpenAdvanceSettings] = useState(false);
  const navigate = useNavigate();
  const query = useMachines();
  const sub = useCurrentPlan();
  const [missingDockerSteps, setMissingDockerSteps] = useState<any>({
    steps: [],
  });

  const createWorkflow = async (machineId?: string) => {
    const requestBody = {
      name: validation.workflowName,
      workflow_json:
        validation.importOption === "import"
          ? validation.importJson
          : validation.workflowJson,
      ...(validation.workflowApi && { workflow_api: validation.workflowApi }),
      ...(machineId && { machine_id: machineId }),
    };

    const result = await api({
      url: "workflow",
      init: {
        method: "POST",
        body: JSON.stringify(requestBody),
      },
    });

    return result;
  };

  useEffect(() => {
    const dockerSteps = convertToDockerSteps(
      validation.dependencies?.custom_nodes,
      validation.selectedConflictingNodes,
    );
    setMissingDockerSteps(dockerSteps);
  }, [
    validation.dependencies?.custom_nodes,
    validation.selectedConflictingNodes,
  ]);

  return (
    <>
      <div className="-top-10 absolute right-0 hidden md:block">
        <Button
          variant={"expandIcon"}
          iconPlacement="right"
          Icon={Settings2}
          className={`${
            sub?.plans?.plans ? "" : "cursor-not-allowed opacity-70"
          }`}
          onClick={() => {
            if (sub?.plans?.plans) {
              setOpenAdvanceSettings(true);
            }
          }}
        >
          Advance Settings
        </Button>
      </div>
      <div className="-top-10 absolute right-0 block md:hidden">
        <Button
          size={"icon"}
          variant={"outline"}
          className={`${
            sub?.plans?.plans ? "" : "cursor-not-allowed opacity-70"
          }`}
          onClick={() => {
            if (sub?.plans?.plans) {
              setOpenAdvanceSettings(true);
            }
          }}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      <InsertModal
        hideButton
        open={openAdvanceSettings && !sub?.features.machineLimited}
        mutateFn={query.refetch}
        setOpen={setOpenAdvanceSettings}
        disabled={sub?.features.machineLimited}
        dialogClassName="!max-w-[1200px] !max-h-[calc(90vh-10rem)]"
        containerClassName="flex-col"
        tooltip={
          sub?.features.machineLimited
            ? `Max ${sub?.features.machineLimit} ComfyUI machine for your account, upgrade to unlock more configuration.`
            : `Max ${sub?.features.machineLimit} ComfyUI machine for your account`
        }
        title="Create New Machine"
        description="Create a new serverless ComfyUI machine based on the analyzed workflow."
        serverAction={async (data: any) => {
          try {
            const machine = await api({
              url: "machine/serverless",
              init: {
                method: "POST",
                body: JSON.stringify(data),
              },
            });

            toast.success(`${data.name} created successfully!`);
            const workflowResult = await createWorkflow(machine.id);
            toast.success(
              `Workflow "${validation.workflowName}" created successfully!`,
            );
            window.open(
              `/workflows/${workflowResult.data.workflow_id}?view=workspace`,
              "_blank",
            );
            toast.info("Redirecting to machine page...");
            navigate({
              to: "/machines/$machineId",
              params: { machineId: machine.id },
              search: { view: "deployments" },
            });

            return {}; // Return empty object since we're handling navigation manually
          } catch (error) {
            toast.error(`Failed to create: ${error}`);
            throw error;
          }
        }}
        formSchema={serverlessFormSchema}
        fieldConfig={sharedMachineConfig}
        // dependencies={sharedMachineConfigDeps}
        data={{
          name: validation.machineName || "",
          gpu: validation.gpuType?.toUpperCase() as "T4" | "A10G" | "A100",
          comfyui_version: validation.comfyUiHash || "",
          machine_builder_version: "4",
          docker_command_steps: missingDockerSteps,

          // default values
          allow_concurrent_inputs: 1,
          concurrency_limit: 2,
          run_timeout: 300,
          idle_timeout: 60,
          ws_timeout: 2,
          python_version: "3.11",
        }}
      />
    </>
  );
}

interface NodeConflict {
  url: string;
  name: string;
  conflictWith: {
    url: string;
    name: string;
    source: string;
  };
}

export function findFirstDuplicateNode(
  customNodes: Record<string, any> = {},
  selectedConflictingNodes: Record<string, any[]> = {},
): NodeConflict | null {
  const urlMap = new Map<
    string,
    { url: string; source: string; name: string }
  >();

  // Check custom nodes
  for (const [url, node] of Object.entries(customNodes)) {
    const lowerUrl = url.toLowerCase();
    if (urlMap.has(lowerUrl)) {
      const existing = urlMap.get(lowerUrl);
      if (existing) {
        return {
          url: url,
          name: node.name,
          conflictWith: {
            url: existing.url,
            name: existing.name,
            source: existing.source,
          },
        };
      }
    }
    urlMap.set(lowerUrl, { url, source: "custom nodes", name: node.name });
  }

  // Create a map to track URLs that are already selected in conflicting nodes
  const selectedUrlsMap = new Map<string, string>();

  // Check conflicting nodes
  for (const [nodeName, nodes] of Object.entries(selectedConflictingNodes)) {
    for (const node of nodes) {
      const lowerUrl = node.url.toLowerCase();

      // If URL exists in custom nodes, that's still a conflict
      if (urlMap.has(lowerUrl)) {
        const existing = urlMap.get(lowerUrl);
        if (existing) {
          return {
            url: node.url,
            name: nodeName,
            conflictWith: {
              url: existing.url,
              name: existing.name,
              source: existing.source,
            },
          };
        }
      }

      // Don't consider it a conflict if the same URL is selected for different nodes
      if (!selectedUrlsMap.has(lowerUrl)) {
        selectedUrlsMap.set(lowerUrl, nodeName);
      }
    }
  }

  return null;
}

// New reusable components
function NodeListItem({
  name,
  author,
  url,
  starCount,
  hasHash,
  isUrlDuplicate,
  checkbox = null,
}: {
  name: string;
  author: string;
  url: string;
  starCount?: number;
  hasHash: boolean;
  isUrlDuplicate: boolean;
  checkbox?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-sm border p-2",
        !hasHash && "bg-red-50 ring-1 ring-red-500 ring-offset-2",
        isUrlDuplicate && "bg-yellow-50 ring-1 ring-yellow-500 ring-offset-2",
      )}
    >
      <div className="group flex items-center gap-3">
        {checkbox}
        <label
          htmlFor={`${url}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-sm"
        >
          <span className="bold truncate whitespace-nowrap">{name}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">by {author}</span>
            {starCount && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span>{starCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </label>
        <Link
          href={url}
          target="_blank"
          className="shrink-0 text-muted-foreground transition-colors hover:text-gray-600"
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function ShowMoreButton({ showAll, setShowAll, totalCount, previewCount }) {
  return totalCount > previewCount ? (
    <Button
      variant="ghost"
      className="mt-2 w-full text-muted-foreground text-xs hover:text-primary"
      onClick={() => setShowAll(!showAll)}
    >
      <div className="flex items-center gap-2">
        {showAll ? (
          <>
            Show Less <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            Show {totalCount - previewCount} More{" "}
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </div>
    </Button>
  ) : null;
}
