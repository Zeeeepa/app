"use client";

import { useUpdateServerActionDialog } from "@/components/auto-form/auto-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentWorkflow } from "@/hooks/use-current-workflow";
import { useSessionAPI } from "@/hooks/use-session-api";
import { useAuthStore } from "@/lib/auth-store";
import { machineGPUOptions } from "@/lib/schema";
import { EventSourcePolyfill } from "event-source-polyfill";
import { Folder, List, Plus, Wrench } from "lucide-react";
import { Info } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ModelList } from "../storage/model-list";
import { ModelListHeader, ModelListView } from "../storage/model-list-view";
import { Skeleton } from "../ui/skeleton";
import { App } from "./App";
import { useLogStore } from "./LogContext";
import { LogDisplay } from "./LogDisplay";
import Workspace from "./Workspace";
// import { OnBoardingDialog } from "@/repo/components/ui/custom/workspace/OnBoardingDialog";
// import { SessionList } from "@/repo/components/ui/custom/workspace/SessionList";
// import { ModelsListLayout } from "@/repo/components/ui/custom/workspace/Windows";
// import { WorkspaceProvider } from "./WorkspaceContext";
import { useCDStore } from "./Workspace";

const staticUrl = process.env.COMFYUI_FRONTEND_URL!;
console.log(staticUrl);

export function ModelsButton(props: {
  isPreview: boolean;
}) {
  return (
    <>
      {!props.isPreview && (
        <>
          <Popover>
            {/* <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-1"
                size="sm"
                Icon={Wrench}
                iconPlacement="left"
              >
                <span className="hidden lg:block">Setup</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-2">
              <OnBoardingDialog />
            </PopoverContent> */}
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-1"
                size="sm"
                Icon={List}
                iconPlacement="left"
              >
                <span className="hidden lg:block">Logs</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-2">
              <LogDisplay />
            </PopoverContent>
          </Popover>
        </>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="gap-1"
            size="sm"
            Icon={Folder}
            iconPlacement="left"
          >
            <span className="hidden lg:block">Models</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-fit p-2">
          <Suspense
            fallback={
              <div className="h-[540px] w-[300px]">
                <div className="flex items-center justify-start gap-2 pb-2 font-semibold">
                  <ModelListHeader />
                </div>
                <div className="flex h-full w-full flex-col gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-[18px] w-full" />
                  ))}
                </div>
              </div>
            }
          >
            <ModelListView className="h-[540px] w-[300px]">
              <ModelList
                apiEndpoint={process.env.COMFY_DEPLOY_SHARED_MACHINE_API_URL}
              />
            </ModelListView>
          </Suspense>
        </PopoverContent>
      </Popover>
    </>
  );
}

export function SessionCreator(props: {
  workflowId: string;
  workflowLatestVersion: any;
}) {
  const { workflow } = useCurrentWorkflow(props.workflowId);
  const machineId = workflow?.selected_machine_id;

  // const [machineId] = useSelectedMachine(undefined, workflow, true);

  const { cdSetup, setCDSetup } = useCDStore();

  const { createSession, listSession, deleteSession } =
    useSessionAPI(machineId);

  const { data: sessions } = listSession;

  // const sessions = [
  //   {
  //     user_id: "user_2ZA6vuKD3IJXju16oJVQGLBcWwg",
  //     org_id: "org_2bWQ1FoWC3Wro391TurkeVG77pC",
  //     id: "0aa3a0b0-200d-444b-a2c7-7c8edb84bcdd",
  //     gpu: "A10G",
  //     gpu_provider: "modal",
  //     updated_at: "2024-09-24T23:56:18.819Z",
  //     modal_function_id: "fc-01J8K7DRZHDBX7WG54HR59M5RX",
  //     start_time: "2024-09-24T23:56:25.878Z",
  //     machine_id: "5641fb6c-8a19-47aa-aa1c-1a98194f3b5f",
  //     end_time: null,
  //     ws_gpu: null,
  //     created_at: "2024-09-24T23:56:26.337Z",
  //     session_id: "77f275fe-2f55-4e74-8072-b27cdd2700c9",
  //     tunnel_url: null,
  //   },
  //   {
  //     user_id: "user_2ZA6vuKD3IJXju16oJVQGLBcWwg",
  //     org_id: "org_2bWQ1FoWC3Wro391TurkeVG77pC",
  //     id: "c68adef1-c712-4258-a1c3-4e3eb4d108dc",
  //     gpu: "A10G",
  //     gpu_provider: "modal",
  //     updated_at: "2024-09-24T23:56:23.859Z",
  //     modal_function_id: "fc-01J8K7DM27Y1GJW176TA5FBB6F",
  //     start_time: "2024-09-24T23:56:20.740Z",
  //     machine_id: "5641fb6c-8a19-47aa-aa1c-1a98194f3b5f",
  //     end_time: null,
  //     ws_gpu: null,
  //     created_at: "2024-09-24T23:56:23.122Z",
  //     session_id: "abda3ab2-cb78-45ad-b3ef-78f33e3ed4fb",
  //     tunnel_url: "https://mpyfls0cgmucem.r8.modal.host",
  //   },
  // ];

  const [sessionId, setSessionId] = useQueryState("sessionId", {
    defaultValue: "preview",
  });

  const { open, ui, setOpen } = useUpdateServerActionDialog({
    title: "Create Session",
    description: "Create a new session",
    formSchema: z.object({
      gpu: z.enum(machineGPUOptions).describe("GPU"),
      timeout: z.number().min(5).describe("Timeout in minutes"),
    }),
    buttonTitle: "Create Session",
    data: {
      gpu: (localStorage.getItem("lastGPUSelection") ||
        "A10G") as (typeof machineGPUOptions)[number],
      timeout: Number.parseInt(
        localStorage.getItem("lastTimeoutSelection") || "15",
      ),
    },
    fieldConfig: {
      gpu: {
        fieldType: "timeoutPicker",
        inputProps: {
          optionsForTier: [
            ["CPU", , "CPU"],
            ["T4", , "T4 (16GB)"],
            ["A10G", , "A10G (24GB)"],
            ["L4", , "L4 (24GB)"],
            ["A100", "business", "A100 (40GB)"],
            ["A100-80GB", "business", "A100-80GB (80GB)"],
            ["H100", "business", "H100 (80GB)"],
          ],
        },
      },
      timeout: {
        inputProps: {
          value: 15,
          min: 1,
          max: 60,
        },
        fieldType: "slider",
        description: "Set the timeout for the session",
      },
    },
    serverAction: async (data) => {
      try {
        localStorage.setItem("lastGPUSelection", data.gpu);
        localStorage.setItem("lastTimeoutSelection", data.timeout.toString());

        const response = await createSession.mutateAsync(data);
        console.log("response", response);
        useLogStore.getState().clearLogs();
        await listSession.refetch();
        setSessionId(response.session_id);
      } catch (e) {
        toast.error("Failed to create session: " + e);
      }
    },
  });

  const create = (
    <Button
      onClick={() =>
        setOpen({
          gpu: (localStorage.getItem("lastGPUSelection") ||
            "A10G") as (typeof machineGPUOptions)[number],
          timeout: Number.parseInt(
            localStorage.getItem("lastTimeoutSelection") || "15",
          ),
        })
      }
      variant="outline"
      size="lg"
      className="flex h-[160px] w-[300px] items-center justify-center gap-2 border-dashed"
    >
      Create New Session <Plus className="h-4 w-4" />
    </Button>
  );

  const session = sessions?.find((session) => session.session_id === sessionId);
  const url = session?.tunnel_url;

  useEffect(() => {
    setCDSetup(false);
  }, [sessionId]);

  useLogListener({ sessionId });

  // probably session closed
  useEffect(() => {
    if (sessionId === "preview") {
      return;
    }
    if (sessionId && !session) {
      setSessionId("preview");
    }

    // if (session) {
    //   useGPUStore.getState().setGpuEventId(session.id);
    // }
  }, [session, sessionId]);

  // const sessionUI = (
  //   <div className="flex h-full w-full flex-col items-center justify-center">
  //     {!sessions || sessions?.length === 0 ? (
  //       create
  //     ) : (
  //       <SessionList
  //         sessions={sessions}
  //         onOpenSession={async (session) => {
  //           setSessionId(session);
  //         }}
  //         onCancelSession={async (session) => {
  //           setSessionId("preview");
  //           await deleteSession.mutateAsync({
  //             sessionId: session,
  //           });
  //         }}
  //       >
  //         {create}
  //       </SessionList>
  //     )}
  //   </div>
  // );

  if (sessionId === "preview") {
    return (
      <>
        {ui}
        <Workspace
          nativeMode={false}
          endpoint={staticUrl}
          workflowJson={props.workflowLatestVersion.workflow}
        />
        <App endpoint={staticUrl}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mx-2 flex cursor-help items-center gap-1">
                  <span className="text-gray-600 text-sm">Preview Mode</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  You're currently viewing a edit-only preview of this workflow.
                  To run the workflow, you'll need to create a new ComfyUI
                  session.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-1"
                Icon={Plus}
                iconPlacement="left"
              >
                Session
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-1">
              <div className="flex flex-col gap-2">{sessionUI}</div>
            </PopoverContent>
          </Popover> */}
          <Button
            variant="default"
            size="sm"
            className="flex items-center gap-1"
            Icon={Plus}
            iconPlacement="left"
            onClick={() => {
              setOpen({
                gpu: (localStorage.getItem("lastGPUSelection") ||
                  "A10G") as (typeof machineGPUOptions)[number],
                timeout: Number.parseInt(
                  localStorage.getItem("lastTimeoutSelection") || "15",
                ),
              });
            }}
          >
            Session
          </Button>
          <ModelsButton isPreview={true} />
        </App>
      </>
    );
  }

  if (sessionId && machineId && url) {
    return (
      <>
        <Workspace
          nativeMode={true}
          endpoint={url}
          workflowJson={props.workflowLatestVersion.workflowJson}
        />
        <App endpoint={url}>
          <ModelsButton isPreview={false} />
        </App>
        {ui}
      </>
    );
  }

  if (sessionId && machineId && !url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Card className="flex flex-col items-center gap-4 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            Warming Up <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </h2>
          <p className="text-center text-muted-foreground text-xs">
            Your session is being prepared. This may take a few moments.
          </p>
          <LogDisplay />
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* {sessionUI} */}
      {ui}
    </>
  );
}

function useLogListener({ sessionId }: { sessionId: string }) {
  const fetchToken = useAuthStore((state) => state.fetchToken);

  useEffect(() => {
    if (!sessionId) return;
    if (sessionId === "preview") return;

    console.log("sessionId", sessionId);

    let eventSource: EventSource;
    let unmounted = false;

    const setupEventSource = async () => {
      const token = await fetchToken();

      if (unmounted) return;

      const url = new URL(
        `${process.env.NEXT_PUBLIC_CD_API_URL}/api/stream-logs`,
      );
      url.searchParams.append("session_id", sessionId);
      url.searchParams.append("log_level", "info");

      eventSource = new EventSourcePolyfill(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as unknown as EventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "keepalive") return;
        // console.log("Received data:", data);
        // console.log("data.message type:", typeof data.message);
        // console.log("data.message content:", data.message);

        try {
          let parsedLogs;
          if (typeof data.message === "string") {
            try {
              parsedLogs = JSON.parse(data.message);
            } catch (error) {
              parsedLogs = [
                {
                  timestamp: new Date(data.timestamp).getTime() / 1000,
                  logs: data.message,
                },
              ];
            }
          } else if (Array.isArray(data.message)) {
            parsedLogs = data.message;
          } else {
            console.error("Unexpected data.message format:", data.message);
            return;
          }

          // console.log("got logs", parsedLogs);

          const log =
            "data:" +
            JSON.stringify({
              timestamp: new Date(data.timestamp).getTime() / 1000,
              logs: data.message,
            });
          // console.log("log", log);

          useLogStore.getState().addLog(log);

          // if (Array.isArray(parsedLogs)) {
          //   setLogs((prevLogs) => [...prevLogs, ...parsedLogs]);
          // } else {
          //   setLogs((prevLogs) => [
          //     ...prevLogs,
          //     {
          //       timestamp: data.timestamp,
          //       logs: JSON.stringify(parsedLogs),
          //     },
          //   ]);
          //   // console.error("Parsed message is not an array:", parsedLogs);
          // }
        } catch (error) {
          console.error("Error processing message:", error);
          console.error("Problematic data:", data.message);
        }
      };

      eventSource.onerror = (event) => {
        console.error("EventSource failed:", event);
        eventSource.close();
      };
    };

    setupEventSource();

    return () => {
      unmounted = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [sessionId, fetchToken]); // Added runId to the dependency array
}
