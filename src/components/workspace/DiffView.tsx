"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { diff } from "json-diff-ts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

export function DiffView({
  workflow,
  oldWorkflow,
  className,
  differences,
}: {
  workflow: any;
  oldWorkflow: any;
  className?: string;
  differences: any;
}) {
  console.log(differences);

  // Update the getNodeInfoFromChanges function to also get node types from the workflow
  const getNodeInfoFromChanges = (workflow: any) => {
    const nodes = new Map();

    // Add existing nodes from workflow
    if (workflow?.nodes) {
      Object.entries(workflow.nodes).forEach(([id, node]: [string, any]) => {
        nodes.set(node.id, {
          type: node.type,
          existing: true,
        });
      });
    }

    return nodes;
  };

  // Update the component to use nodeInfo
  const nodeInfo = useMemo(() => getNodeInfoFromChanges(workflow), [workflow]);
  const oldNodeInfo = useMemo(
    () => getNodeInfoFromChanges(oldWorkflow),
    [oldWorkflow],
  );

  // Add this helper function
  const getNodeType = (path: string, nodeInfo: Map<number, any>) => {
    // Match any path that starts with 'nodes.' followed by a number
    // This will match: nodes.6, nodes.6.something, nodes.6.something.x.x
    const match = path.match(/^nodes\.(\d+)(?:\.|$)/);
    if (match) {
      const nodeId = Number.parseInt(match[1], 10);
      const type = nodeInfo.get(nodeId)?.type;
      console.log(nodeId, type);
      return type;
    }
    return null;
  };

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(() => {
    // Process differences to find paths containing .pos and set them as initially collapsed
    const initialState: Record<string, boolean> = {};
    const processChange = (change: any, path: string[] = []) => {
      const currentPath = [...path, change.key].join(".");
      if (currentPath.includes(".pos")) {
        const nodeType = getNodeType(currentPath, nodeInfo) || "other";
        // Get all paths containing .pos for this nodeType
        const pathsForType = Object.keys(initialState).filter(
          (key) => key.includes(`-${nodeType}-`) && key.startsWith("update"),
        );
        const index = pathsForType.length;
        ["update", "add", "remove"].forEach((type) => {
          initialState[`${type}-${nodeType}-${index}`] = true;
        });
      }
      if (change.changes) {
        change.changes.forEach((subChange: any) =>
          processChange(subChange, currentPath ? currentPath.split(".") : []),
        );
      }
    };
    differences.forEach((change: any) => processChange(change));
    console.log(initialState);

    return initialState;
  });

  console.log(collapsedSections);

  const isNodePath = (path: string) => path.startsWith("nodes.");

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const flattenChanges = (changes: any[]) => {
    const groupedChanges = {
      updates: new Map<
        string,
        Record<string, { oldValue: any; newValue: any }>
      >(),
      additions: new Map<string, any>(),
      removals: new Map<string, any>(),
    };

    // Keep track of removed paths to skip their children
    const removedPaths = new Set<string>();

    const processChange = (change: any, currentPath: string[] = []) => {
      const fullPath = currentPath.join(".");

      // Skip if any parent path has been removed
      if (Array.from(removedPaths).some((path) => fullPath.startsWith(path))) {
        return;
      }

      if (change.type === "REMOVE") {
        const path = [...currentPath, change.key].join(".");
        groupedChanges.removals.set(path, change.value);
        removedPaths.add(path);
        return; // Skip processing children of removed objects
      }

      if (change.type === "ADD") {
        const path = [...currentPath, change.key].join(".");
        groupedChanges.additions.set(path, change.value);
      } else if (change.type === "UPDATE") {
        if (change.value !== undefined || change.oldValue !== undefined) {
          const pathWithoutLast = currentPath.join(".");
          const lastKey = change.key;

          if (!groupedChanges.updates.has(pathWithoutLast)) {
            groupedChanges.updates.set(pathWithoutLast, {});
          }

          const group = groupedChanges.updates.get(pathWithoutLast)!;
          group[lastKey] = {
            oldValue: change.oldValue,
            newValue: change.value,
          };
        } else if (change.changes) {
          const newPath = [...currentPath];
          if (change.key) newPath.push(change.key);
          change.changes.forEach((subChange: any) =>
            processChange(subChange, newPath),
          );
        }
      }
    };

    changes.forEach((change) => processChange(change));
    return groupedChanges;
  };

  const groupedChanges = useMemo(() => {
    return flattenChanges(differences);
  }, [differences]);

  const sortChanges = (entries: [string, any][]) => {
    return entries.sort((a, b) => {
      const aIsNode = isNodePath(a[0]);
      const bIsNode = isNodePath(b[0]);
      if (aIsNode && !bIsNode) return -1;
      if (!aIsNode && bIsNode) return 1;
      return a[0].localeCompare(b[0]);
    });
  };

  // Add this helper function after getNodeType
  const formatPath = (path: string, nodeInfo: Map<string, any>) => {
    return path.replace(/nodes\.(\d+)/g, (match, nodeId) => {
      const type = nodeInfo.get(nodeId)?.type;
      return type ? `nodes.${type}` : match;
    });
  };

  // Add helper function to group all changes by node type
  const groupAllChangesByNodeType = (
    groupedChanges: any,
    nodeInfo: Map<number, any>,
    oldNodeInfo: Map<number, any>,
  ) => {
    const grouped = new Map<
      string | null,
      {
        updates: [string, any][];
        additions: [string, any][];
        removals: [string, any][];
      }
    >();

    // Helper to process each change type
    const processChanges = (
      changes: Map<string, any>,
      changeType: "updates" | "additions" | "removals",
    ) => {
      changes.forEach((value, path) => {
        const nodeType = getNodeType(
          path,
          changeType === "removals" ? oldNodeInfo : nodeInfo,
        );
        if (!grouped.has(nodeType)) {
          grouped.set(nodeType, {
            updates: [],
            additions: [],
            removals: [],
          });
        }
        grouped.get(nodeType)![changeType].push([path, value]);
      });
    };

    processChanges(groupedChanges.updates, "updates");
    processChanges(groupedChanges.additions, "additions");
    processChanges(groupedChanges.removals, "removals");

    // Sort groups so that null (non-node changes) comes last
    return new Map(
      [...grouped.entries()].sort((a, b) => {
        if (a[0] === null) return 1;
        if (b[0] === null) return -1;
        return (a[0] || "").localeCompare(b[0] || "");
      }),
    );
  };

  return (
    <div className={cn("space-y-6 pr-4", className)}>
      {Array.from(
        groupAllChangesByNodeType(groupedChanges, nodeInfo, oldNodeInfo),
      ).map(([nodeType, changes]) => (
        <div key={nodeType || "other"} className="space-y-3">
          <Badge className="text-lg font-semibold text-gray-900">
            {nodeType || "Other"}
          </Badge>

          {/* Updates */}
          {changes.updates.length > 0 && (
            <div className="space-y-2">
              {/* <h3 className="text-sm font-medium text-gray-700 ml-4">
                  Updates
                </h3> */}
              {changes.updates.map(([path, changes], index) => {
                const sectionId = `update-${nodeType}-${index}`;
                const isCollapsed = collapsedSections[sectionId];
                return (
                  <div
                    key={sectionId}
                    className={`${
                      isCollapsed ? "" : "border rounded-lg p-2"
                    } ml-6`}
                  >
                    <h3
                      className={`text-xs font-medium text-gray-500 flex items-center cursor-pointer ${
                        isCollapsed ? "" : "mb-1"
                      }`}
                      onClick={() => toggleSection(sectionId)}
                    >
                      <span className="mr-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </span>
                      {/* {nodeType && (
                          <span className="ml-2 text-blue-500">
                            ({nodeType})
                          </span>
                        )} */}
                      <Badge>{path}</Badge>
                    </h3>
                    {!isCollapsed && (
                      <div className="space-y-1">
                        {Object.entries(changes).map(([key, value]) => {
                          const { oldValue, newValue } = value as {
                            oldValue: unknown;
                            newValue: unknown;
                          };
                          // Check if this is a link type change (contains "CLIP", "LATENT", etc.)
                          const isLinkTypeChange =
                            typeof oldValue === "string" &&
                            typeof newValue === "string" &&
                            (oldValue.toUpperCase() === oldValue ||
                              newValue.toUpperCase() === newValue);

                          return (
                            <div
                              key={key}
                              className="text-xs flex items-center gap-2 bg-gray-50 px-2 py-1 rounded dark:bg-zinc-900/20 dark:text-zinc-100"
                            >
                              <span className="text-red-500 font-medium dark:text-red-400">
                                -
                              </span>
                              <span className="text-red-600 dark:text-red-400">
                                {isLinkTypeChange ? (
                                  <span className="font-mono bg-red-100 px-1 rounded dark:bg-red-900/20 dark:text-red-400">
                                    {oldValue}
                                  </span>
                                ) : (
                                  JSON.stringify(oldValue)
                                )}
                              </span>
                              <span className="text-gray-400 mx-1 dark:text-zinc-400">
                                →
                              </span>
                              <span className="text-green-500 font-medium dark:text-green-400">
                                +
                              </span>
                              <span className="text-green-600 dark:text-green-400">
                                {isLinkTypeChange ? (
                                  <span className="font-mono bg-green-100 px-1 rounded dark:bg-green-900/20 dark:text-green-400">
                                    {newValue}
                                  </span>
                                ) : (
                                  JSON.stringify(newValue)
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Additions */}
          {changes.additions.length > 0 && (
            <div className="space-y-2">
              {/* <h3 className="text-sm font-medium text-green-700 ml-4">
                  Additions
                </h3> */}
              {changes.additions.map(([path, value], index) => {
                const sectionId = `add-${nodeType}-${index}`;
                const isCollapsed = collapsedSections[sectionId];
                return (
                  <div
                    key={sectionId}
                    className={`${
                      isCollapsed ? "" : "border rounded-lg p-2"
                    } ml-6`}
                  >
                    <h3
                      className={`text-xs font-medium text-green-600 flex items-center cursor-pointer dark:text-green-400 ${
                        isCollapsed ? "" : "mb-1"
                      }`}
                      onClick={() => toggleSection(sectionId)}
                    >
                      <span className="mr-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </span>
                      {/* Added: {path}
                        {nodeType && (
                          <span className="ml-2 text-blue-500">
                            ({nodeType})
                          </span>
                        )} */}
                      <Badge>{path}</Badge>
                    </h3>
                    {!isCollapsed && (
                      <div className="bg-green-50 px-2 py-1 rounded text-xs dark:bg-green-900/20 dark:text-green-400">
                        <span className="text-green-500 font-medium dark:text-green-400">
                          +
                        </span>{" "}
                        {JSON.stringify(value, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Removals */}
          {changes.removals.length > 0 && (
            <div className="space-y-2">
              {/* <h3 className="text-sm font-medium text-red-700 ml-4">
                  Removals
                </h3> */}
              {changes.removals.map(([path, value], index) => {
                const sectionId = `remove-${nodeType}-${index}`;
                const isCollapsed = collapsedSections[sectionId];
                return (
                  <div
                    key={sectionId}
                    className={`${
                      isCollapsed ? "" : "border rounded-lg p-2"
                    } ml-6`}
                  >
                    <h3
                      className={`text-xs font-medium text-red-600 flex items-center cursor-pointer dark:text-red-400 ${
                        isCollapsed ? "" : "mb-1"
                      }`}
                      onClick={() => toggleSection(sectionId)}
                    >
                      <span className="mr-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </span>
                      {/* Removed: {path} */}
                      {/* {nodeType && (
                          <span className="ml-2 text-blue-500">
                            ({nodeType})
                          </span>
                        )} */}
                      <Badge>{path}</Badge>
                    </h3>
                    {!isCollapsed && (
                      <div className="bg-red-50 px-2 py-1 rounded text-xs dark:bg-red-900/20 dark:text-red-400">
                        <span className="text-red-500 font-medium dark:text-red-400">
                          -
                        </span>{" "}
                        {JSON.stringify(value, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type SnapshotDiffViewProps = {
  newSnapshot: any;
  oldSnapshot: any;
  onSnapshotActionChange: (hasChanges: boolean) => void;
};

export function SnapshotDiffView({
  newSnapshot,
  oldSnapshot,
  onSnapshotActionChange,
}: SnapshotDiffViewProps) {
  const differences = diff(oldSnapshot, newSnapshot, {
    keysToSkip: ["pips", "file_custom_nodes"],
  });

  // Effect to update snapshot action based on differences
  useEffect(() => {
    // Only consider it a change if we have both snapshots and actual differences
    const hasChanges = Boolean(
      differences && differences.length > 0 && oldSnapshot,
    );

    onSnapshotActionChange(hasChanges);
  }, [differences, oldSnapshot, onSnapshotActionChange]);

  // Helper to extract repo info
  const getRepoInfo = (url: string) => {
    const parts = url.replace("https://github.com/", "").split("/");
    return {
      author: parts[0],
      repo: parts[1],
    };
  };

  if (!differences || differences.length === 0 || !oldSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-4 text-center">
        <div className="mb-2 rounded-full bg-green-50 p-1 dark:bg-green-900/20 dark:text-green-400">
          <svg
            className="h-6 w-6 text-green-500 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="font-medium text-gray-900 text-sm dark:text-zinc-100">
          No differences found
        </h3>
        <p className="text-2xs text-gray-500 dark:text-zinc-400">
          The snapshots are identical
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {differences.map((change) => {
        if (change.key === "comfyui") {
          return (
            <div
              key="comfyui"
              className="flex w-full items-center justify-between rounded-sm border bg-gray-50 p-2 dark:bg-zinc-900/20 dark:text-zinc-100"
            >
              <Badge className="!text-xs !py-0">ComfyUI Version</Badge>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="rounded-[4px] bg-red-50 px-2 py-0.5 text-2xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {change.oldValue?.slice(0, 7)}
                </span>
                <span className="text-gray-400 dark:text-zinc-400">→</span>
                <span className="rounded-[4px] bg-green-50 px-2 py-0.5 text-2xs text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  {change.value?.slice(0, 7)}
                </span>
              </div>
            </div>
          );
        }

        if (change.key === "cnr_custom_nodes") {
          return (
            <div key="cnr_custom_nodes" className="rounded-sm border p-2">
              <Badge className="!text-xs !py-0 mb-2">Custom Nodes</Badge>
              <div className="space-y-1">
                {change.changes?.map((nodeChange: any) => {
                  if (nodeChange.type === "REMOVE") {
                    return (
                      <div
                        key={nodeChange.key}
                        className="flex w-full items-center gap-2 rounded-[4px] bg-red-50 px-2 py-0.5 text-xs dark:bg-red-900/20 dark:text-red-400"
                      >
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -
                        </span>
                        <span className="font-medium dark:text-zinc-100">
                          {nodeChange.key}
                        </span>
                        <span className="text-gray-600 dark:text-zinc-400">
                          v{nodeChange.value}
                        </span>
                      </div>
                    );
                  }

                  if (nodeChange.type === "ADD") {
                    return (
                      <div
                        key={nodeChange.key}
                        className="flex w-full items-center gap-2 rounded-[4px] bg-green-50 px-2 py-0.5 text-xs dark:bg-green-900/20 dark:text-green-400"
                      >
                        <span className="font-medium text-green-600 dark:text-green-400">
                          +
                        </span>
                        <span className="font-medium dark:text-zinc-100">
                          {nodeChange.key}
                        </span>
                        <span className="text-gray-600">
                          v{nodeChange.value}
                        </span>
                      </div>
                    );
                  }

                  // UPDATE case (version change)
                  if (nodeChange.type === "UPDATE") {
                    return (
                      <div
                        key={nodeChange.key}
                        className="flex w-full items-center justify-between px-2 py-0.5"
                      >
                        <span className="font-medium">{nodeChange.key}</span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="rounded-[4px] bg-red-50 px-2 py-0.5 text-2xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                            v{nodeChange.oldValue}
                          </span>
                          <span className="text-gray-400 dark:text-zinc-400">
                            →
                          </span>
                          <span className="rounded-[4px] bg-green-50 px-2 py-0.5 text-2xs text-green-600 dark:bg-green-900/20 dark:text-green-400">
                            v{nodeChange.value}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          );
        }

        if (change.key === "git_custom_nodes") {
          return (
            <div key="git_custom_nodes" className="rounded-sm border p-2">
              <Badge className="!text-xs !py-0 mb-2">Custom Nodes</Badge>
              <div className="space-y-1">
                {change.changes?.map((nodeChange: any) => {
                  const { author, repo } = getRepoInfo(nodeChange.key);

                  if (nodeChange.type === "REMOVE") {
                    return (
                      <div
                        key={nodeChange.key}
                        className="flex w-full items-center gap-2 rounded-[4px] bg-red-50 px-2 py-0.5 text-xs dark:bg-red-900/20 dark:text-red-400"
                      >
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -
                        </span>
                        <span className="text-gray-600 dark:text-zinc-400">
                          {author}/
                        </span>
                        <span className="font-medium">{repo}</span>
                      </div>
                    );
                  }

                  if (nodeChange.type === "ADD") {
                    return (
                      <div
                        key={nodeChange.key}
                        className="flex w-full items-center gap-2 rounded-[4px] bg-green-50 px-2 py-0.5 text-xs dark:bg-green-900/20 dark:text-green-400"
                      >
                        <span className="font-medium text-green-600 dark:text-green-400">
                          +
                        </span>
                        <span className="text-gray-600 dark:text-zinc-400">
                          {author}/
                        </span>
                        <span className="font-medium">{repo}</span>
                      </div>
                    );
                  }

                  // UPDATE case
                  return (
                    <div key={nodeChange.key}>
                      <div className="flex w-full items-center justify-between px-2 py-0.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            ↻
                          </span>
                          <span className="text-gray-600 dark:text-zinc-400">
                            {author}/
                          </span>
                          <span className="font-medium">{repo}</span>
                        </div>
                        {nodeChange.changes?.some(
                          (c) => c.key === "disabled",
                        ) && (
                          <div className="text-gray-600 text-xs dark:text-zinc-400">
                            {nodeChange.changes.map((subChange: any) => {
                              if (subChange.key === "disabled") {
                                return (
                                  <div
                                    key="disabled"
                                    className="flex items-center gap-2"
                                  >
                                    <Badge
                                      variant={
                                        subChange.value ? "secondary" : "green"
                                      }
                                      className="!text-2xs"
                                    >
                                      {subChange.value ? "Disabled" : "Enabled"}
                                    </Badge>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                        {nodeChange.changes?.map((subChange: any) => {
                          if (subChange.key === "hash") {
                            return (
                              <div
                                className="ml-4 flex items-center gap-2 font-mono text-xs"
                                key={subChange.key}
                              >
                                <span className="rounded-[4px] bg-red-50 px-2 py-0.5 text-2xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                  {subChange.oldValue?.slice(0, 7)}
                                </span>
                                <span className="text-gray-400 dark:text-zinc-400">
                                  →
                                </span>
                                <span className="rounded-[4px] bg-green-50 px-2 py-0.5 text-2xs text-green-600">
                                  {subChange.value?.slice(0, 7)}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/**
 * Gets a minimal representation of workflow differences with just the essential information.
 *
 * @param oldWorkflow - The original workflow to compare
 * @param newWorkflow - The new workflow to compare
 * @param workflowApi - The workflow API structure providing additional context
 * @returns Minimal diff with only input names, values, and node types
 */
export function getMinimalWorkflowDiff(
  oldWorkflow: any,
  newWorkflow: any,
  workflowApi: any = null,
) {
  const differences = diff(oldWorkflow, newWorkflow, {
    keysToSkip: ["extra", "order", "$index"],
    embeddedObjKeys: {
      nodes: "id",
    },
  });

  // Data source for node information
  const nodeSource = workflowApi || newWorkflow;
  const oldNodeSource = workflowApi || oldWorkflow;

  // Extract node info
  const getNodeInfo = (workflow: any) => {
    const nodes = new Map();

    if (!workflow) return nodes;

    // Handle API format (with class_type)
    const isApiFormat = Object.values(workflow).some(
      (node: any) => node && typeof node === "object" && "class_type" in node,
    );

    if (isApiFormat) {
      for (const [nodeId, data] of Object.entries(workflow)) {
        if (typeof data === "object" && data !== null) {
          nodes.set(nodeId, {
            id: nodeId,
            type: data.class_type || null,
            title: data._meta?.title || null,
            inputs: data.inputs || {},
          });
        }
      }
    } else if (workflow.nodes) {
      // Handle standard format
      for (const [_, node] of Object.entries(workflow.nodes)) {
        nodes.set(node.id, {
          id: node.id,
          type: node.type,
          title: node.title || null,
          inputs: node.inputs || {},
        });
      }
    }

    return nodes;
  };

  const nodeInfo = getNodeInfo(nodeSource);
  const oldNodeInfo = getNodeInfo(oldNodeSource);

  // Extract node ID from path
  const getNodeId = (path: string) => {
    const match = path.match(/^(?:nodes\.)?(\d+)(?:\.|$)/);
    return match ? match[1] : null;
  };

  // Extract parameter name from path
  const getParamName = (
    path: string,
    nodeId: string | null,
    nodes: Map<string, any>,
  ) => {
    // Regular input parameter
    const inputMatch = path.match(/inputs\.([^.]+)$/);
    if (inputMatch) return inputMatch[1];

    // Widget value (captures both named and numeric indices)
    const widgetMatch = path.match(/widgets_values\.([^.]+)$/);
    if (widgetMatch) {
      const widgetKey = widgetMatch[1];

      // If it's a numeric index, try to map it to an input name
      if (/^\d+$/.test(widgetKey) && nodeId) {
        const node = nodes.get(nodeId);
        if (node?.inputs) {
          const idx = Number.parseInt(widgetKey, 10);
          const inputNames = Object.keys(node.inputs);
          if (inputNames.length > idx) {
            return inputNames[idx];
          }
        }
        // If we can't map it to an input name, return the index as is
        return widgetKey;
      }

      // For named widget values, return as is
      return widgetKey;
    }

    return null;
  };

  // Store simplified changes
  const changes = {
    updates: [] as any[],
    additions: [] as any[],
    removals: [] as any[],
  };

  // Change this part to track changes by node+input combination
  const processedChanges = new Map<string, any>();

  // Process changes
  const processChange = (change: any, path: string[] = []) => {
    const fullPath = [...path, change.key].join(".");
    const nodeId = getNodeId(fullPath);
    const nodes = change.type === "REMOVE" ? oldNodeInfo : nodeInfo;
    const paramName = getParamName(fullPath, nodeId, nodes);
    const nodeData = nodeId ? nodes.get(nodeId) : null;

    // Only process if we have a node ID
    if (nodeId) {
      // Create a unique key for this node+input combination
      const changeKey = `${nodeId}:${paramName || "unknown"}`;

      if (change.type === "UPDATE") {
        // Only add if we haven't already processed this node+input combo
        // or if it has a real input name (prefer real input names over null)
        if (
          !processedChanges.has(changeKey) ||
          (paramName && !processedChanges.get(changeKey).inputName)
        ) {
          const changeInfo = {
            nodeId,
            nodeType: nodeData?.type,
            nodeTitle: nodeData?.title,
            inputName: paramName,
            oldValue: change.oldValue,
            newValue: change.value,
            path: fullPath, // Store path for debugging
          };

          changes.updates.push(changeInfo);
          processedChanges.set(changeKey, changeInfo);
        }
      } else if (change.type === "ADD") {
        changes.additions.push({
          nodeId,
          nodeType: nodeData?.type,
          nodeTitle: nodeData?.title,
          inputName: paramName,
          value: change.value,
        });
      } else if (change.type === "REMOVE") {
        changes.removals.push({
          nodeId,
          nodeType: nodeData?.type,
          nodeTitle: nodeData?.title,
          inputName: paramName,
          value: change.value,
        });
      }
    }

    // Process nested changes
    if (change.changes) {
      for (const subChange of change.changes) {
        processChange(subChange, fullPath ? fullPath.split(".") : []);
      }
    }
  };

  // Process all changes
  if (Array.isArray(differences)) {
    for (const change of differences) {
      processChange(change);
    }
  }

  // Filter duplicates first
  const filteredUpdates = [];
  const updatesByNode = new Map();

  // Group by nodeId
  for (const update of changes.updates) {
    const key = update.nodeId;
    if (!updatesByNode.has(key)) {
      updatesByNode.set(key, []);
    }
    updatesByNode.get(key).push(update);
  }

  // For each node, keep only the best updates
  for (const [_, nodeUpdates] of updatesByNode) {
    // If we have updates with inputName, only keep those
    const updatesWithNames = nodeUpdates.filter((u) => u.inputName !== null);
    if (updatesWithNames.length > 0) {
      filteredUpdates.push(...updatesWithNames);
    } else {
      // Otherwise keep all
      filteredUpdates.push(...nodeUpdates);
    }
  }

  // Update the updates array with filtered version
  changes.updates = filteredUpdates;

  // Calculate the correct summary based on filtered values
  return {
    summary: {
      total:
        changes.updates.length +
        changes.additions.length +
        changes.removals.length,
      updates: changes.updates.length,
      additions: changes.additions.length,
      removals: changes.removals.length,
    },
    changes,
  };
}
