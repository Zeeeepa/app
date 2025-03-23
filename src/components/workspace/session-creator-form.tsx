import { GPUSelectBox } from "@/components/machine/machine-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLogStore } from "@/components/workspace/LogContext";
import {
  useMachine,
  useMachines,
  useMachineVersion,
} from "@/hooks/use-machine";
import { useSessionAPI } from "@/hooks/use-session-api";
import { useParams, useRouter } from "@tanstack/react-router";
import {
  Droplets,
  Loader2,
  Search,
  StopCircle,
  ArrowRightToLine,
  RotateCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { api } from "@/lib/api";
import { useQueryState } from "nuqs";
import { UserIcon } from "../run/SharePageComponent";
import { SessionTimer } from "@/components/workspace/SessionTimer";

interface SessionForm {
  machineId: string;
  gpu: "A10G" | "CPU" | "T4" | "L4" | "L40S" | "A100" | "A100-80GB" | "H100";
  timeout: number;
}

interface SessionCreatorFormProps {
  workflowId: string;
  version: number;
  defaultMachineId?: string;
  defaultMachineVersionId?: string;
  isFluidVersion?: boolean;
  onSuccess?: () => void;
  showCancelButton?: boolean;
  onCancel?: () => void;
}

export function MachineSessionsList({ machineId }: { machineId: string }) {
  const { listSession, deleteSession } = useSessionAPI(machineId);
  const { data: sessions } = listSession;
  const router = useRouter();
  const params = useParams({ from: "/workflows/$workflowId/$view" });
  const [sessionId, setSessionId] = useQueryState("sessionId");

  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No active sessions for this machine
      </div>
    );
  }

  return (
    <div className="space-y-1 py-1">
      {sessions.map((session) => (
        <div
          key={session.session_id}
          className="group flex items-center justify-between rounded-lg border bg-background p-2 hover:bg-blue-50/50"
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
          <div
            className="flex flex-1 cursor-pointer items-center gap-2 pl-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSessionId(session.session_id);
              router.navigate({
                to: "/workflows/$workflowId/$view",
                params: { workflowId: params.workflowId, view: "workspace" },
                search: {
                  isFirstTime: true,
                  workflowId: params.workflowId,
                },
              });
            }}
          >
            <div className="relative flex h-4 w-4 items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <RotateCw className="absolute h-4 w-4 animate-spin text-green-500 opacity-50" />
            </div>
            <UserIcon user_id={session.user_id} className="h-6 w-6" />
            <span className="text-muted-foreground text-xs">
              {session.session_id.slice(0, 8)}
            </span>
            <Badge variant="outline">{session.gpu}</Badge>
            <ArrowRightToLine className="mr-2 ml-auto h-4 w-4 text-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <SessionTimer session={session} size="sm" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={deleteSession.isPending}
                  className="text-red-500 hover:text-red-600"
                  Icon={StopCircle}
                  iconPlacement="right"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await deleteSession.mutateAsync({
                        sessionId: session.session_id,
                      });
                      toast.success("Session stopped successfully");
                    } catch (error) {
                      toast.error("Failed to stop session");
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop Session</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ))}
    </div>
  );
}

export function SessionCreatorForm({
  workflowId,
  version,
  defaultMachineId,
  defaultMachineVersionId,
  isFluidVersion: defaultIsFluidVersion,
  onSuccess,
  showCancelButton = false,
  onCancel,
}: SessionCreatorFormProps) {
  const router = useRouter();
  const { createSession: createDynamicSession } = useSessionAPI();
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue] = useDebounce(searchValue, 250);
  const { data: machinesData } = useMachines(debouncedSearchValue);
  const machines = machinesData?.pages.flat() ?? [];

  const [_, setSessionId] = useQueryState("sessionId");

  const form = useForm<SessionForm>({
    defaultValues: {
      machineId: defaultMachineId || "",
      gpu: "A10G",
      timeout: 15,
    },
  });

  const selectedMachineId = form.watch("machineId");
  const { data: selectedMachine } = useMachine(selectedMachineId);

  const { data: machineVersionData } = useMachineVersion(
    defaultMachineId || "",
    defaultMachineVersionId || "",
  );

  const isFluidVersion =
    defaultIsFluidVersion ?? !!machineVersionData?.modal_image_id;

  const onSubmit = async (data: SessionForm) => {
    try {
      const response = await createDynamicSession.mutateAsync({
        gpu: data.gpu,
        timeout: data.timeout,
        machine_id: data.machineId,
        machine_version_id: defaultMachineVersionId,
      });

      // Update workflow's machine if not a fluid version and machine has changed
      if (!isFluidVersion && data.machineId !== defaultMachineId) {
        try {
          await api({
            url: `workflow/${workflowId}`,
            init: {
              method: "PATCH",
              body: JSON.stringify({
                selected_machine_id: data.machineId,
              }),
            },
          });
        } catch (error) {
          console.error("Failed to update workflow machine:", error);
          // Don't block session creation if this fails
        }
      }

      useLogStore.getState().clearLogs();

      router.navigate({
        to: "/workflows/$workflowId/$view",
        params: { workflowId, view: "workspace" },
        search: {
          isFirstTime: true,
          workflowId: workflowId,
        },
      });

      setSessionId(response.session_id);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create session");
    }
  };

  // Update GPU when machine changes
  useEffect(() => {
    if (selectedMachine?.gpu) {
      form.setValue("gpu", selectedMachine.gpu);
    }
  }, [selectedMachine, form]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h2 className="font-semibold text-lg">Workspace</h2>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          Start and edit your workflow{" "}
          <Badge variant="outline" className="gap-2">
            {isFluidVersion && (
              <div className="rounded-full bg-blue-100 p-0.5">
                <Droplets
                  strokeWidth={2}
                  className="h-[12px] w-[12px] text-blue-600"
                />
              </div>
            )}
            v{version}
          </Badge>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="machineId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine</FormLabel>
                {isFluidVersion ? (
                  <div className="bg-muted border border-input rounded-md px-3 py-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>{selectedMachine?.name}</span>
                    </div>
                    {field.value && (
                      <MachineSessionsList machineId={field.value} />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search machines..."
                        className="pl-10 text-sm"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                    </div>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedMachine = machines.find(
                          (m) => m.id === value,
                        );
                        if (selectedMachine?.gpu) {
                          form.setValue("gpu", selectedMachine.gpu);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a machine">
                            {selectedMachine && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span>{selectedMachine.name}</span>
                                {selectedMachine.gpu && (
                                  <Badge variant="outline" className="ml-2">
                                    {selectedMachine.gpu}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {machines.map((machine) => (
                          <SelectItem
                            key={machine.id}
                            value={machine.id}
                            className="py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span>{machine.name}</span>
                              {machine.gpu && (
                                <Badge variant="outline" className="ml-2">
                                  {machine.gpu}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value && (
                      <MachineSessionsList machineId={field.value} />
                    )}
                  </>
                )}
                <FormDescription>
                  {isFluidVersion
                    ? "Machine is pre-configured for this fluid version"
                    : "Choose the machine to run this workflow version on"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gpu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GPU Type</FormLabel>
                <FormControl>
                  <GPUSelectBox
                    className="w-full"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  {isFluidVersion
                    ? "GPU type is pre-configured for this fluid version"
                    : "Select the GPU type for your session"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Timeout</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeout">
                        {field.value} mins
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="2">2 mins</SelectItem>
                    <SelectItem value="15">15 mins</SelectItem>
                    <SelectItem value="30">30 mins</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how long the session should run before auto-termination
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            {showCancelButton && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={createDynamicSession.isPending}>
              {createDynamicSession.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Session
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
