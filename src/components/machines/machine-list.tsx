import { InsertModal } from "@/components/auto-form/auto-form-dialog";
import { Fab } from "@/components/fab";
import {
  customFormSchema,
  serverlessFormSchema,
  sharedMachineConfig,
} from "@/components/machine/machine-schema";
import { MachineListItem } from "@/components/machines/machine-list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VirtualizedInfiniteList } from "@/components/virtualized-infinite-list";
import { useCurrentPlan } from "@/hooks/use-current-plan";
import { useMachines } from "@/hooks/use-machine";
import { api } from "@/lib/api";
import { callServerPromise } from "@/lib/call-server-promise";
import { cn } from "@/lib/utils";
import { comfyui_hash } from "@/utils/comfydeploy-hash";
import { useNavigate } from "@tanstack/react-router";
import { Cloud, CloudCog, EllipsisVertical, Plus, Server } from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

// const BATCH_SIZE = 20; // Same as in use-machine.ts

interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
  // Add other machine properties as needed
}

export function MachineList() {
  const [searchValue, setSearchValue] = useQueryState("search");
  const [openCustomDialog, setOpenCustomDialog] = useState(false);
  const [openServerlessDialog, setOpenServerlessDialog] = useState(false);
  const [debouncedSearchValue] = useDebounce(searchValue, 250);
  const navigate = useNavigate({ from: "/machines" });

  type TabType = "docker" | "workspace" | "self-hosted";
  const [selectedTab, setSelectedTab] = useState<TabType>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    return tabParam === "docker" ||
      tabParam === "workspace" ||
      tabParam === "self-hosted"
      ? tabParam
      : "docker";
  });

  // const handleTabChange = (value: string) => {
  //   setSelectedTab(value as TabType);
  //   navigate({
  //     search: (prev) => ({ ...prev, tab: value }),
  //   });
  // };

  const sub = useCurrentPlan();
  const hasActiveSub = !sub || !!sub?.sub;

  const query = useMachines(debouncedSearchValue ?? undefined);

  return (
    <div className="mx-auto h-[calc(100vh-100px)] max-h-full w-full max-w-[1200px] px-2 py-4 md:px-10">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="relative w-[300px]">
          <Input
            placeholder="Filter machines..."
            value={searchValue ?? ""}
            onChange={(event) => setSearchValue(event.target.value)}
            className="pr-12"
          />
          <kbd className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        {/* <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <motion.div className="inline-flex items-center rounded-lg bg-white/95 py-0.5 ring-1 ring-gray-200/50 ">
            <TabsList className="relative flex w-fit gap-1 bg-transparent">
              <motion.div layout className="relative">
                <TabsTrigger
                  value="docker"
                  className={cn(
                    "rounded-md px-4 py-1.5 font-medium text-sm transition-all",
                    selectedTab === "docker"
                      ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  Docker Machine
                </TabsTrigger>
              </motion.div>
              <motion.div layout className="relative">
                <TabsTrigger
                  value="self-hosted"
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                    selectedTab === "self-hosted"
                      ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  Self Hosted
                </TabsTrigger>
              </motion.div>
              <motion.div layout className="relative">
                <TabsTrigger
                  value="workspace"
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                    selectedTab === "workspace"
                      ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  Workspace
                </TabsTrigger>
              </motion.div>
            </TabsList>
          </motion.div>
        </Tabs> */}
      </div>

      {query.isLoading ? (
        <div className="mx-auto w-full max-w-[1200px] overflow-clip rounded-xl border">
          {[...Array(8)].map((_, i) => (
            <div
              key={`loading-${i}`}
              className="flex h-[68px] w-full animate-pulse items-center justify-between border-b bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row items-center gap-2">
                    <div className="h-[10px] w-[10px] rounded-full bg-gray-200" />
                    <div className="h-4 w-60 rounded bg-gray-200" />
                  </div>
                  <div className="h-3 w-32 rounded bg-gray-200" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 rounded-md bg-gray-200" />
                <div className="h-5 w-20 rounded-md bg-gray-200" />
                <div className="h-5 w-12 rounded-md bg-gray-200" />
                <Button variant="ghost" size="icon">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : query.data?.pages[0].length === 0 ? (
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-xl border bg-white/50 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              {selectedTab === "workspace" ? (
                <>
                  <h3 className="font-semibold text-lg">No Workspace Found</h3>
                  <p className="text-muted-foreground text-sm">
                    Create your first workspace to get started with ComfyUI
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">No machines found</h3>
                  <p className="text-sm text-muted-foreground">
                    Get started by creating your first machine
                  </p>
                </>
              )}
            </div>
            {selectedTab === "workspace" ? (
              <Button
                onClick={() => {
                  navigate({ to: "/home" });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (!sub?.features.machineLimited) {
                    navigate({
                      search: { view: "create" },
                    });
                  }
                }}
                disabled={sub?.features.machineLimited}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Machine
              </Button>
            )}
          </div>
        </div>
      ) : (
        <VirtualizedInfiniteList
          className="!h-full fab-machine-list mx-auto w-full max-w-[1200px] rounded-xl border"
          containerClassName="divide-y divide-border"
          queryResult={query}
          renderItem={(machine: Machine, index) => (
            <MachineListItem
              key={machine.id}
              index={index}
              machine={machine}
              refetchQuery={query.refetch}
              selectedTab={selectedTab}
            />
          )}
          renderLoading={() => {
            return [...Array(4)].map((_, i) => (
              <div
                key={`loading-item-${i}`}
                className="flex h-[80px] w-full animate-pulse items-center justify-between border bg-white p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row items-center gap-2">
                      <div className="h-[10px] w-[10px] rounded-full bg-gray-200" />
                      <div className="h-4 w-60 rounded bg-gray-200" />
                    </div>
                    <div className="h-3 w-32 rounded bg-gray-200" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 rounded-md bg-gray-200" />
                  <div className="h-5 w-20 rounded-md bg-gray-200" />
                  <div className="h-5 w-12 rounded-md bg-gray-200" />
                  <Button variant="ghost" size="icon">
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ));
          }}
          estimateSize={68}
        />
      )}

      <InsertModal
        hideButton
        open={openCustomDialog}
        mutateFn={query.refetch}
        setOpen={setOpenCustomDialog}
        title="Self Hosted Machine"
        disabled={!hasActiveSub}
        tooltip={!hasActiveSub ? "Upgrade in pricing tab!" : ""}
        description="Add self hosted comfyui machines to your account."
        serverAction={async (data) => {
          console.log("custom machine", data);
          try {
            const machine = await api({
              url: "machine/custom",
              init: {
                method: "POST",
                body: JSON.stringify(data),
              },
            });
            console.log("machine", machine);
            toast.success(`${data.name} created successfully!`);
            toast.info("Redirecting to machine page...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            navigate({
              to: "/machines/$machineId",
              params: { machineId: machine.id },
              search: { view: undefined },
            });
            return {}; // Return empty object since we're handling navigation manually
          } catch (error) {
            toast.error(`Failed to create: ${error}`);
            throw error;
          }
        }}
        formSchema={customFormSchema}
      />

      <InsertModal
        hideButton
        open={openServerlessDialog}
        mutateFn={query.refetch}
        setOpen={setOpenServerlessDialog}
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
            toast.info("Redirecting to machine page...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            navigate({
              to: "/machines/$machineId",
              params: { machineId: machine.id },
              search: { view: "history" },
            });

            return {}; // Return empty object since we're handling navigation manually
          } catch (error) {
            toast.error(`Failed to create: ${error}`);
            throw error;
          }
        }}
        formSchema={serverlessFormSchema}
        fieldConfig={sharedMachineConfig}
        data={{
          name: "My Machine",
          gpu: "A10G",
          comfyui_version: comfyui_hash,
          machine_builder_version: "4",
          docker_command_steps: {
            steps: [],
          },

          // default values
          allow_concurrent_inputs: 1,
          concurrency_limit: 2,
          run_timeout: 300,
          idle_timeout: 60,
          ws_timeout: 2,
          python_version: "3.11",
        }}
      />

      <Fab
        refScrollingContainerKey="fab-machine-list"
        mainItem={{
          name: "Create Machine",
          icon: Plus,
        }}
        disabled={{
          disabled: sub?.features.machineLimited,
          disabledText: "Max Machines Exceeded. ",
        }}
        subItems={[
          {
            name: sub
              ? `Docker Machine (${sub.features.currentMachineCount}/${sub.features.machineLimit})`
              : "Docker Machine",
            icon: Cloud,
            onClick: () => {
              if (!sub?.features.machineLimited) {
                navigate({
                  search: { view: "create" },
                });
              }
            },
            disabled: {
              disabled: sub?.features.machineLimited,
              disabledText: `Max ${sub?.features.machineLimit} Docker machines for your account. Upgrade to create more machines.`,
            },
          },
          {
            name: "Self Hosted Machine",
            icon: Server,
            onClick: () => {
              if (!sub?.features.machineLimited) {
                setOpenCustomDialog(true);
              }
            },
            disabled: {
              disabled: !(sub?.plans?.plans && sub?.plans?.plans.length > 0),
              disabledText: "Upgrade to create custom machines.",
            },
          },
        ]}
      />
    </div>
  );
}

interface MachineDialogProps {
  machine: any;
  refetch?: () => void;
  dialogOpen: boolean;
  setDialogOpen: (dialogOpen: boolean) => void;
}

export function DeleteMachineDialog({
  machine,
  refetch,
  planRefetch,
  dialogOpen,
  setDialogOpen,
}: MachineDialogProps & { planRefetch?: () => void }) {
  const navigate = useNavigate();

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className={cn("sm:max-w-[425px]")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {"Delete"} <Badge variant={"secondary"}>{machine.name}</Badge>
          </DialogTitle>
          <DialogDescription className="text-primary">
            Careful this is destructive and cannot be undone.
            {machine.type === "workspace" && (
              <>
                <br />
                <br />
                Deleting Workspaces will remove all outputs, contact us if you
                want to save your configuration
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full justify-end gap-2">
          <Button
            className="w-fit"
            variant={"outline"}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();

              setDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            className="w-fit"
            variant="destructive"
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();

              if (machine?.keep_warm !== undefined && machine.keep_warm > 0) {
                toast.error(
                  "Please set keep warm to 0 before deleting the machine.",
                );
                return;
              }

              await callServerPromise(
                api({
                  url: `machine/${machine.id}`,
                  init: {
                    method: "DELETE",
                  },
                }),
                {
                  loadingText: "Deleting machine",
                  errorAction: {
                    name: "Force delete",
                    action: async () => {
                      await callServerPromise(
                        api({
                          url: `machine/${machine.id}`,
                          init: {
                            method: "DELETE",
                          },
                          params: {
                            force: true,
                          },
                        }),
                        {
                          loadingText: "Deleting machine",
                        },
                      );
                      await planRefetch();
                    },
                  },
                },
              );

              await refetch();
              setDialogOpen(false);

              navigate({
                to: "/machines",
                search: { view: undefined },
              });
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RebuildMachineDialog({
  machine,
  refetch,
  dialogOpen,
  setDialogOpen,
}: MachineDialogProps) {
  const navigate = useNavigate();
  const oldVersion = machine.machine_builder_version < 4;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className={cn("sm:max-w-[425px]")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {"Rebuild"} <Badge variant={"secondary"}>{machine.name}</Badge>
          </DialogTitle>
          <DialogDescription className="text-primary">
            Rebuild the machine to get the latest version of the machine builder
            or resolve any build issues.
            {oldVersion && (
              <div className="mt-4 rounded-md border-2 border-yellow-500/20 bg-yellow-500/10 p-3">
                <div className="flex items-center gap-2 text-yellow-700">
                  <CloudCog className="h-5 w-5" />
                  <span className="font-semibold">Version Update Required</span>
                </div>
                <p className="mt-1 text-yellow-700">
                  Your current version{" "}
                  <Badge
                    variant="red"
                    className="border-yellow-500 text-yellow-700"
                  >
                    v{machine.machine_builder_version}
                  </Badge>{" "}
                  is <span className="font-semibold">no longer supported</span>.
                  The machine will be automatically upgraded to{" "}
                  <Badge
                    variant="green"
                    className="border-yellow-500 text-yellow-700"
                  >
                    v4
                  </Badge>{" "}
                  after rebuild.
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full justify-end gap-2">
          <div className="flex gap-2">
            <Button
              className="w-fit"
              variant={"outline"}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="w-fit"
              onClick={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                try {
                  await callServerPromise(
                    api({
                      url: `machine/serverless/${machine.id}`,
                      init: {
                        method: "PATCH",
                        body: JSON.stringify({
                          is_trigger_rebuild: true,
                          ...(oldVersion && {
                            machine_builder_version: 4,
                          }),
                        }),
                      },
                    }),
                    {
                      loadingText: "Rebuilding machine",
                      successMessage: "Redirecting to machine page...",
                      onSuccess: () => {
                        navigate({
                          to: "/machines/$machineId",
                          params: { machineId: machine.id },
                        });
                      },
                    },
                  );
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch {
                  toast.error("Failed to rebuild machine");
                }
                setDialogOpen(false);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
