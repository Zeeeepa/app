import { TextShimmer } from "@/components/motion-ui/text-shimmer";
import { Progress } from "@/components/ui/progress";
import { getMachineBuildProgress } from "@/hooks/use-machine-build-progress";
import { AnimatePresence, easeOut, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface MessageProgress {
  message: string;
  startProgress: number;
}

interface WorkspaceLoadingProps {
  messages?: MessageProgress[];
  progress?: number; // progress is a number between 0 and 100
}

export function WorkspaceLoading({
  messages = [{ message: "Please wait", startProgress: 0 }],
  progress = 0,
}: WorkspaceLoadingProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#1e1e1e]">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `linear-gradient(#2c2c2c 1px, transparent 1px),
                           linear-gradient(90deg, #2c2c2c 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-8 text-sm">
          <AnimatePresence mode="wait">
            {messages
              .filter(({ startProgress }, index, arr) => {
                const nextThreshold =
                  arr[index + 1]?.startProgress ?? Number.POSITIVE_INFINITY;
                return progress >= startProgress && progress < nextThreshold;
              })
              .map(({ message }) => (
                <motion.div
                  key={message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: easeOut }}
                >
                  <TextShimmer className="[--base-color:theme(colors.gray.600)] [--base-gradient-color:theme(colors.gray.200)] dark:[--base-color:theme(colors.gray.700)] dark:[--base-gradient-color:theme(colors.gray.400)]">
                    {message}
                  </TextShimmer>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* Node representation */}
        <div className="relative flex items-start space-x-20">
          {/* Left node */}
          <div className="flex h-24 w-40 flex-col justify-between rounded-md bg-[#3c3c3c] p-2 shadow-lg">
            <div className="flex justify-start">
              <div className="h-3 w-3 rounded-full bg-[#00ff00]" />
            </div>
            <div className="h-3 w-full rounded bg-[#2c2c2c]" />
            <div className="h-3 w-3/4 rounded bg-[#2c2c2c]" />
          </div>

          {/* Right node - positioned lower */}
          <div className="mt-16 flex h-24 w-40 flex-col justify-between rounded-md bg-[#3c3c3c] p-2 shadow-lg">
            <div className="flex justify-start">
              <div className="h-3 w-3 rounded-full bg-[#00ff00]" />
            </div>
            <div className="h-3 w-full rounded bg-[#2c2c2c]" />
            <div className="h-3 w-3/4 rounded bg-[#2c2c2c]" />
          </div>

          {/* Curved connection line */}
          <svg
            className="absolute top-0 left-[80px] h-48 w-20"
            viewBox="0 0 224 192"
          >
            <path
              d="M0 12 C112 12, 112 180, 224 180"
              stroke="#3c3c3c"
              strokeWidth="10"
              fill="none"
            />
            <path
              d="M0 12 C112 12, 112 180, 224 180"
              stroke="#00ff00"
              strokeWidth="10"
              fill="none"
              strokeDasharray="300"
              strokeDashoffset={300 - (progress ?? 0) * 3}
              className="transition-all duration-300 ease-in-out"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceMachineLoading({
  machine,
  endpoint,
}: {
  machine: any;
  endpoint: string;
}) {
  const messages = [
    `${machine.name} is building...`,
    "This may take a few minutes...",
    "You can check out machine page for more details...",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  const progress = getMachineBuildProgress({
    machine_id: machine.id,
    endpoint,
    instance_id: machine.build_machine_instance_id!,
    machine,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-stone-200">
      {/* Grid background */}
      <div
        className="absolute inset-0 overflow-hidden opacity-5"
        style={{
          backgroundImage: `linear-gradient(#2c2c2c 1px, transparent 1px),
                       linear-gradient(90deg, #2c2c2c 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            animation: "moveGradient 3s linear infinite",
            background:
              "linear-gradient(45deg, transparent 0%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 55%, transparent 100%)",
            backgroundSize: "200% 200%",
            filter: "blur(2px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMessageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: easeOut }}
          >
            <TextShimmer className="mb-8 font-mono text-sm" spread={3}>
              {messages[currentMessageIndex]}
            </TextShimmer>
          </motion.div>
        </AnimatePresence>

        <style>
          {`
            @keyframes dash {
              0% { stroke-dashoffset: 500; }
              100% { stroke-dashoffset: 90; }
            }
            @keyframes pulse {
              0% { opacity: 0.3; }
              50% { opacity: 1; }
              100% { opacity: 0.3; }
            }
        `}
        </style>

        <svg
          width="74"
          height="60"
          viewBox="0 0 74 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="30"
            cy="43"
            r="3"
            fill="black"
            style={{
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <circle
            cx="17"
            cy="43"
            r="3"
            fill="black"
            style={{
              animation: "pulse 2s ease-in-out infinite",
              animationDelay: "1s", // Offset timing for second circle
            }}
          />
          <path
            d="M70.5 30.5L58.5 7.5C57.5 5.5 56.2728 3.5 54 3.5C52.4 3.5 31 3.5 20.5 3.5C18.5 3.5 16.4633 5.07334 15.5 7C14.5 9 9.60018 17.7996 6.5 24C3.5 30 3.5 28.5 3.5 31C3.5 36 3.5 44 3.5 49.5C3.5 52 5.1 56.5 9.5 56.5C13.9 56.5 47.8333 56.5 64.5 56.5C66.5 56.5 70.5 54.5 70.5 49.5C70.5 45.5 70.5 40.1667 70.5 36C70.5 30.7304 66.3674 30 65 30C61 30 24 30 6 30"
            stroke="black"
            strokeWidth="6"
            strokeLinecap="round"
            opacity={0.1}
          />

          <path
            d="M70.5 30.5L58.5 7.5C57.5 5.5 56.2728 3.5 54 3.5C52.4 3.5 31 3.5 20.5 3.5C18.5 3.5 16.4633 5.07334 15.5 7C14.5 9 9.60018 17.7996 6.5 24C3.5 30 3.5 28.5 3.5 31C3.5 36 3.5 44 3.5 49.5C3.5 52 5.1 56.5 9.5 56.5C13.9 56.5 47.8333 56.5 64.5 56.5C66.5 56.5 70.5 54.5 70.5 49.5C70.5 45.5 70.5 40.1667 70.5 36C70.5 30.7304 66.3674 30 65 30C61 30 24 30 6 30"
            stroke="black"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="50 400"
            style={{
              animation: "dash 2s ease-in-out infinite alternate",
            }}
          />
        </svg>

        {/* Progress bar */}
        <div className="my-4 w-40 opacity-50">
          <div className="relative w-full">
            <Progress value={progress} className="w-40" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 3s infinite linear",
              }}
            />
            <style jsx>{`
              @keyframes shimmer {
                0% {
                  background-position: 200% 0;
                }
                100% {
                  background-position: -200% 0;
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}
