import { createFileRoute } from "@tanstack/react-router";
import { useCurrentPlanWithStatus } from "@/hooks/use-current-plan";
import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ENTERPRISE_TIER } from "@/components/pricing/tiers";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { AnimatedLogoCard } from "@/components/AnimatedLogoCard";

import { useGPUPricing } from "@/components/pricing/GPUPriceSimulator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeButton } from "@/components/pricing/plan-button";
import { api } from "@/lib/api";
import { callServerPromise } from "@/lib/call-server-promise";
import { TopUpButton } from "@/components/pricing/TopUpButton";
import { BlueprintOutline } from "@/components/ui/custom/blueprint-outline";

// Import customer logos
import BuckLogo from "@/logos/buck.svg";
import SliversideLogo from "@/logos/sliverside.svg";
import VizcomLogo from "@/logos/vizcom.svg";
import WildlifeLogo from "@/logos/wildlife.svg";

// Import team member photos
import NickPhoto from "@/logos/nick.png";
import BennyPhoto from "@/logos/benny.png";

export const Route = createFileRoute("/pricing")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      ready: search.ready as boolean | undefined,
      plan: search.plan as string | undefined,
    };
  },
});

type TierFeature = {
  Basic?: ReactNode | boolean | number;
  Creator?: ReactNode | boolean | number;
  Deployment?: ReactNode | boolean | number;
  Business?: ReactNode | boolean | number;
};

type Tier = {
  name: string;
  id: string;
  priceMonthly: string;
  priceYearly: string;
  description: ReactNode;
};

const tiers: Tier[] = [
  {
    name: "Pay as you go",
    id: "free",
    priceMonthly: "Free",
    priceYearly: "Free",
    description: "Run any ComfyUI workflow now",
  },
  {
    name: "Creator",
    id: "creator",
    priceMonthly: "$34",
    priceYearly: "$340",
    description: "For individual creators, run ComfyUI anywhere",
  },
  {
    name: "Deployment",
    id: "deployment",
    priceMonthly: "$100",
    priceYearly: "$1000",
    description: "For production deployments, team collaboration",
  },
  {
    name: "Business",
    id: "business",
    priceMonthly: "from $998",
    priceYearly: "from $9980",
    description: "Enterprise-grade AI infrastructure trusted by industry leaders",
  },
  {
    name: "Enterprise",
    id: "large_enterprise",
    priceMonthly: "Custom",
    priceYearly: "Custom",
    description: "SSO + custom integration",
  },
];

const sections = [
  {
    name: "Features",
    features: [
      {
        name: "Run shared workflow",
        tiers: {
          Basic: true,
          Creator: true,
          Deployment: true,
          Business: true,
        },
      },
      {
        name: "GPU Concurrency",
        tiers: {
          Basic: "1",
          Creator: "1",
          Deployment: "10",
          Business: "Custom",
        },
      },
      {
        name: "GPU Types",
        tiers: {
          Basic: "Limited",
          Creator: "All GPU",
          Deployment: "All GPU",
          Business: "All GPU",
        },
      },
      {
        name: "Private workflows",
        tiers: {
          Basic: false,
          Creator: "Unlimited",
          Deployment: "Unlimited",
          Business: "Unlimited",
        },
      },
      {
        name: "Models",
        tiers: {
          Basic: "Limited",
          Creator: "Unlimited",
          Deployment: "Unlimited",
          Business: "Unlimited",
        },
      },
      {
        name: "Custom nodes",
        tiers: {
          Basic: false,
          Creator: "Unlimited",
          Deployment: "Unlimited",
          Business: "Unlimited",
        },
      },
      {
        name: "Workspace",
        tiers: {
          Basic: "Limited",
          Creator: "Unlimited",
          Deployment: "Unlimited",
          Business: "Unlimited",
        },
      },
      {
        name: "Share workflows",
        tiers: {
          Basic: false,
          Creator: true,
          Deployment: true,
          Business: true,
        },
      },
      {
        name: "APIs",
        tiers: {
          Basic: false,
          Creator: false,
          Deployment: true,
          Business: true,
        },
      },
      {
        name: "SDKs",
        tiers: {
          Basic: false,
          Creator: false,
          Deployment: true,
          Business: true,
        },
      },
      {
        name: "Production API endpoints",
        tiers: {
          Basic: false,
          Creator: false,
          Deployment: "Max 5",
          Business: "Unlimited",
        },
      },
      {
        name: "Organization",
        tiers: {
          Basic: false,
          Creator: false,
          Deployment: "1 org (max 4 people)",
          Business: "Uncap Seats",
        },
      },
      {
        name: "Internal APIs",
        tiers: {
          Basic: false,
          Creator: false,
          Deployment: false,
          Business: true,
        },
      },
      {
        name: "SSO + custom integration",
        tiers: {
          Basic: false,
          Creator: false,
          Deployment: false,
          Business: "Add on",
        },
      },
    ],
  },
];

function PricingTier({
  tier,
  isLoading,
  plans,
  className,
  isYearly,
  showCreatorTier = true,
  showDeploymentTier = true,
  showBusinessUpgradeButton = false,
}: {
  tier: Tier;
  isLoading: boolean;
  plans: string[];
  className?: string;
  isYearly: boolean;
  showCreatorTier?: boolean;
  showDeploymentTier?: boolean;
  showBusinessUpgradeButton?: boolean;
}) {
  const getAvailableFeatures = (tierName: string) => {
    if (tierName === "Business" && (!showCreatorTier || !showDeploymentTier)) {
      return sections[0].features.filter((feature) => {
        const value = feature.tiers[tierName as keyof TierFeature];
        if (
          (typeof value === "boolean" && value) ||
          (value !== undefined && value !== null)
        ) {
          return true;
        }

        if (!showCreatorTier && feature.tiers.Creator) {
          return true;
        }

        if (!showDeploymentTier && feature.tiers.Deployment) {
          return true;
        }

        return false;
      });
    }

    return sections[0].features.filter((feature) => {
      const value = feature.tiers[tierName as keyof TierFeature];
      if (typeof value === "boolean") return value;
      return value !== undefined && value !== null;
    });
  };

  const renderIncludesMessage = () => {
    if (tier.id === "free") return null;
    if (tier.name === "Business") return null; // Hide includes message for Business
    if (tier.name === "Creator") return "Includes everything in Pay as you go";
    if (tier.name === "Deployment") {
      return showCreatorTier
        ? "Includes everything in Creator"
        : "Includes everything in Pay as you go";
    }
    return null;
  };

  const getMonthlyPrice = (price: string) => {
    if (price === "Free") return "Free";
    if (price === "Custom") return "Custom"; // Handle Custom price for Enterprise tier
    if (price.includes("from")) {
      if (!isYearly) return price;
      const amount = Number.parseInt(price.replace(/\D/g, ""));
      return `from $${Math.round((amount * 10) / 12)}`;
    }
    if (!isYearly) return price;
    const amount = Number.parseInt(price.replace(/\D/g, ""));
    return `$${Math.round((amount * 10) / 12)}`;
  };

  const getYearlyTotal = (price: string) => {
    if (price === "Free") return "Free";
    if (price === "Custom") return "Custom"; // Handle Custom price for Enterprise tier
    if (price.includes("from")) {
      const amount = Number.parseInt(price.replace(/\D/g, ""));
      return `from $${amount * 10}`;
    }
    const amount = Number.parseInt(price.replace(/\D/g, ""));
    return `$${amount * 10}`;
  };

  // const { data: subscription } = useCurrentPlanWithStatus();
  const { data: _sub } = useCurrentPlanWithStatus();

  // Check if this tier is the user's current plan
  const isCurrentPlan = _sub?.plans?.plans?.some((plan: string) =>
    plan.startsWith(tier.id),
  );

  return (
    <div className={cn("border-gray-200 flex flex-col relative lg:h-[500px]", className)}>
      {isCurrentPlan && tier.id !== "free" && (
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await callServerPromise(
                api({
                  url: `platform/stripe/dashboard?redirect_url=${encodeURIComponent(
                    window.location.href,
                  )}`,
                }),
                {
                  loadingText: "Redirecting to Stripe...",
                },
              );
              window.open(res.url, "_blank");
            }}
          >
            Manage Subscription
          </Button>
        </div>
      )}
      <div className="flex flex-1 flex-col">
        {tier.name === "Business" ? (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex-shrink-0 mb-6 pt-4 px-4">
              <h3 className="font-bold text-3xl">{tier.name}</h3>
              <p className="mt-2 text-sm  text-gray-900 dark:text-zinc-200 leading-relaxed text-balance">
                <div className="text-secondary-foreground">Looking to invite your teams? Start scaling your GPUs?</div>
                <div>Join these creative teams to push the boundaries of GenAI.</div>
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <div className="grid grid-cols-2 h-full min-h-[200px] gap-px">
                <AnimatedLogoCard
                  logo={BuckLogo}
                  altText="Buck Studios"
                  description="Integrate With Artist Tool Chain"
                  hoverBgColor="hover:bg-gradient-to-br hover:from-orange-400/20 hover:via-orange-400/60 hover:to-orange-500 dark:hover:from-orange-800/10 dark:hover:via-orange-800/40 dark:hover:to-orange-700/70"
                />
                <AnimatedLogoCard
                  logo={VizcomLogo}
                  altText="Vizcom"
                  description="Accelerate Artist's Comfy Experimentation"
                  hoverBgColor="hover:bg-gradient-to-br hover:from-blue-400/20 hover:via-blue-400/60 hover:to-blue-500 dark:hover:from-blue-800/10 dark:hover:via-blue-800/40 dark:hover:to-blue-700/70"
                />
                <AnimatedLogoCard
                  logo={SliversideLogo}
                  altText="Sliverside"
                  description="Scale Comfy to the Artist Team"
                  hoverBgColor="hover:bg-gradient-to-br hover:from-green-400/20 hover:via-green-400/60 hover:to-green-500 dark:hover:from-green-800/10 dark:hover:via-green-800/40 dark:hover:to-green-700/70"
                />
                <AnimatedLogoCard
                  logo={WildlifeLogo}
                  altText="Wildlife"
                  description="From 0 to 100 A100s Running Comfy in Production"
                  hoverBgColor="hover:bg-gradient-to-br hover:from-red-400/20 hover:via-red-400/60 hover:to-red-500 dark:hover:from-red-800/10 dark:hover:via-red-800/40 dark:hover:to-red-700/70"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col p-4">
            <div>
              <h3 className={`font-bold ${tier.id === "free" ? "text-3xl" : "text-lg"}`}>{tier.name}</h3>
              {tier.id !== "free" && (
                <div className="flex items-baseline mt-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isYearly ? "yearly" : "monthly"}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="font-bold text-3xl"
                    >
                      {getMonthlyPrice(tier.priceMonthly)}
                    </motion.span>
                  </AnimatePresence>
                  {tier.priceMonthly !== "Free" &&
                    !tier.priceMonthly.includes("from") && (
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={isYearly ? "yearly" : "monthly"}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="ml-1 text-gray-500 dark:text-zinc-400"
                        >
                          /month
                        </motion.span>
                      </AnimatePresence>
                    )}
                </div>
              )}
              {isYearly && tier.priceMonthly !== "Free" && (
                <div className="text-sm text-gray-500 mt-1 dark:text-zinc-400">
                  Billed yearly: {getYearlyTotal(tier.priceMonthly)}{" "}
                  <span className="ml-1 text-green-600">(2 months free)</span>
                </div>
              )}
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {tier.description}
              </p>
            </div>

            {tier.name !== "Business" && (
              <ul className="mt-4 space-y-1.5 text-xs">
                {/* Include message for higher tiers */}
                {renderIncludesMessage() && (
                  <li className="flex items-center">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="ml-2 font-medium text-gray-900 dark:text-zinc-200">
                      {renderIncludesMessage()}
                    </span>
                  </li>
                )}

                {/* Show only available features */}
                {tier.id === "free" && (
                  <>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-zinc-400">
                        Any GPU
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-zinc-400">
                        GPU Concurrency{" "}
                        <Badge
                          variant="secondary"
                          className="ml-1 rounded-[4px] text-[10px]"
                        >
                          1
                        </Badge>
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-zinc-400">
                        Cloud Machine{" "}
                        <Badge
                          variant="secondary"
                          className="ml-1 rounded-[4px] text-[10px]"
                        >
                          Max 1
                        </Badge>
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-zinc-400">
                        Credit base
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-zinc-400">
                        Full API Access
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-zinc-400">
                        Unlimited Workflows
                      </span>
                    </li>
                  </>
                )}

                {tier.name !== "Business" && tier.id !== "free" &&
                  getAvailableFeatures(tier.name)
                    .filter((feature) => {
                      const value = feature.tiers[tier.name as keyof TierFeature];
                      const prevTierValue =
                        tier.name === "Creator"
                          ? feature.tiers.Basic
                          : tier.name === "Deployment"
                            ? showCreatorTier
                              ? feature.tiers.Creator
                              : feature.tiers.Basic
                            : null;

                      return (
                        JSON.stringify(value) !== JSON.stringify(prevTierValue)
                      );
                    })
                    .map((feature) => {
                      const value = feature.tiers[tier.name as keyof TierFeature];
                      return (
                        <li key={feature.name} className="flex items-center">
                          <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                          <span className="ml-2 text-gray-600 dark:text-zinc-400">
                            {feature.name}
                            {typeof value === "string" && (
                              <Badge
                                variant="secondary"
                                className="ml-1 rounded-[4px] text-[10px]"
                              >
                                {value}
                              </Badge>
                            )}
                          </span>
                        </li>
                      );
                    })
                }
              </ul>
            )}

          </div>
        )}

        {tier.id === "free" && (
          <div className="mt-4">
            <div className="text-center mb-4">
              <a
                href="#gpu-price"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-4 transition-colors"
              >
                View GPU pricing
                <svg
                  className="ml-1 h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
            </div>
            <TopUpButton
              className="border-b-0 border-t border-x-0 bg-green-900 text-white hover:bg-transparent hover:text-gray-900 p-6 rounded-none transition-colors w-full dark:bg-green-900/50 dark:text-zinc-100 dark:hover:bg-transparent dark:hover:text-green-600"
              variant="outline"
            >
              Top up $25 to get started
            </TopUpButton>
          </div>
        )}

        {tier.id !== "free" && (
          <div className="">
            {tier.name === "Business" ? (
              <div className={cn("grid gap-px", showBusinessUpgradeButton ? "grid-cols-2" : "grid-cols-1")}>
                {showBusinessUpgradeButton && (
                  <UpgradeButton
                    plan={`${tier.id}_${isYearly ? "yearly" : "monthly"}`}
                    href={`/checkout?plan=${tier.id}`}
                    plans={plans}
                    className="border-b-0 border-t border-x-0 hover:bg-gray-900 hover:text-white p-6 rounded-none text-gray-900 transition-colors w-full dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:text-gray-300"
                    trial={false}
                    allowCoupon={true}
                    data={{
                      tier: tier.name,
                      price: isYearly ? tier.priceYearly : tier.priceMonthly,
                      billing: isYearly ? "yearly" : "monthly",
                    }}
                    subscription={_sub?.plans?.autumn_data}
                  />
                )}
                <Button
                  asChild
                  className="border-b-0 border-t border-x-0 hover:bg-purple-900 hover:text-white p-6 rounded-none text-gray-900 transition-colors w-full dark:hover:bg-purple-900/50 dark:hover:text-zinc-100 dark:text-purple-400"
                  variant="outline"
                >
                  <Link to="https://comfydeploy.link/l-call" target="_blank" className="flex items-center justify-center gap-3">
                    <div className="flex -space-x-2">
                      <img
                        src={NickPhoto}
                        alt="Nick"
                        className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                      />
                      <img
                        src={BennyPhoto}
                        alt="Benny"
                        className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                      />
                    </div>
                    <span>Talk to Nick and Benny</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : tier.name === "Enterprise" ? (
              <div className="grid grid-cols-1 gap-px">
                <Button
                  asChild
                  className="border-b-0 border-t border-x-0 hover:bg-indigo-900 hover:text-white p-6 rounded-none text-gray-900 transition-colors w-full dark:hover:bg-indigo-900/50 dark:hover:text-zinc-100 dark:text-indigo-400"
                  variant="outline"
                >
                  <Link to="https://comfydeploy.link/l-call" target="_blank" className="flex items-center justify-center gap-3">
                    <div className="flex -space-x-2">
                      <img
                        src={NickPhoto}
                        alt="Nick"
                        className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                      />
                      <img
                        src={BennyPhoto}
                        alt="Benny"
                        className="h-6 w-6 rounded-full border-2 border-white object-cover dark:border-zinc-800"
                      />
                    </div>
                    <span>Talk to Nick and Benny</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <UpgradeButton
                plan={`${tier.id}_${isYearly ? "yearly" : "monthly"}`}
                href={`/checkout?plan=${tier.id}`}
                plans={plans}
                className="border-b-0 border-t border-x-0 hover:bg-gray-900 hover:text-white p-6 rounded-none text-gray-900 transition-colors w-full dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:text-zinc-200"
                trial={false}
                allowCoupon={true}
                data={{
                  tier: tier.name,
                  price: isYearly ? tier.priceYearly : tier.priceMonthly,
                  billing: isYearly ? "yearly" : "monthly",
                }}
                subscription={_sub?.plans?.autumn_data}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GPUPricingTable() {
  const [activeTab, setActiveTab] = useState<"per_sec" | "per_hour">(
    "per_hour",
  );
  const { data: gpuPricing, isLoading: gpuPricingLoading } = useGPUPricing();

  return (
    <div className="mt-12 mx-auto max-w-2xl">
      <div className="relative bg-white dark:bg-zinc-900 p-4 rounded-sm">
        <BlueprintOutline />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="gpu-price" className="font-bold text-xl text-gray-900 dark:text-zinc-200">
                GPU Pricing
              </h2>
              <p className="mt-1 text-gray-500 text-xs dark:text-zinc-400">
                Transparent, usage-based pricing for all GPU types
              </p>
            </div>
            <motion.div className="inline-flex items-center rounded-full bg-white/95 p-0.5 shadow-sm ring-1 ring-gray-200/50 backdrop-blur-sm dark:bg-zinc-900 dark:ring-zinc-700/50">
              <Button
                variant="ghost"
                onClick={() => setActiveTab("per_sec")}
                className={cn(
                  "font-medium px-3 py-1 rounded-full text-xs transition-all",
                  activeTab === "per_sec"
                    ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50 dark:from-zinc-800 dark:to-zinc-700 dark:ring-zinc-700/50"
                    : "hover:bg-gray-100 text-gray-600 dark:text-zinc-400 dark:hover:bg-zinc-700/50",
                )}
              >
                Per second
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab("per_hour")}
                className={cn(
                  "font-medium px-3 py-1 rounded-full text-xs transition-all",
                  activeTab === "per_hour"
                    ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50 dark:from-zinc-800 dark:to-zinc-700 dark:ring-zinc-700/50"
                    : "hover:bg-gray-100 text-gray-600 dark:text-zinc-400 dark:hover:bg-zinc-700/50",
                )}
              >
                Per hour
              </Button>
            </motion.div>
          </div>
          <div className="relative w-full overflow-hidden">
            <Table>
              <TableBody>
                {gpuPricingLoading
                  ? // Skeleton loading state
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index} className="border-0">
                      <TableCell className="border-0 font-medium px-1 py-0.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="border-0 px-1 py-0.5 text-right">
                        <Skeleton className="h-3 w-12 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                  : Object.entries(gpuPricing || {}).map(([gpu, price]) => (
                    <TableRow key={gpu} className="border-0">
                      <TableCell className="border-0 font-medium px-1 py-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          {gpu}
                          {(gpu === "H200" || gpu === "B200") && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-50 h-3 px-1 py-0 text-[8px] text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                            >
                              NEW
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="border-0 px-1 py-0.5 text-right">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="font-medium inline-block"
                          >
                            {activeTab === "per_sec" ? (
                              <span className="text-xs">
                                ${price as number}
                                <span className="ml-1 text-gray-500">
                                  / sec
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs">
                                ${((price as number) * 60 * 60).toFixed(2)}
                                <span className="ml-1 text-gray-500">
                                  / hour
                                </span>
                              </span>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteComponent() {
  return <PricingPage />;
}

export function PricingPage() {
  const { data: _sub, isLoading } = useCurrentPlanWithStatus();
  const [isYearly, setIsYearly] = useState(false);

  // Feature flags
  const showBusinessUpgradeButton = false;

  // Determine user's current plan
  const userPlans = _sub?.plans?.plans || [];
  const isOnFreePlan = userPlans.some((plan: string) =>
    plan.startsWith("free"),
  ) || userPlans.length === 0;
  const isOnCreatorPlan = userPlans.some((plan: string) =>
    plan.startsWith("creator"),
  );
  const isOnDeploymentPlan = userPlans.some((plan: string) =>
    plan.startsWith("deployment"),
  );
  const isOnBusinessPlan = userPlans.some((plan: string) =>
    plan.startsWith("business"),
  );

  const filteredTiers = tiers.filter((tier) => {
    if (tier.id === "free") return true;

    if (tier.id === "business") return true;

    if (tier.id === "large_enterprise") return true;

    if (tier.id === "creator" || tier.id === "deployment") {
      if (isOnCreatorPlan || isOnDeploymentPlan) return true;

      if (isOnFreePlan) return false;

      if (userPlans.length === 0 || isOnBusinessPlan) return false;

      return true;
    }

    return true;
  });

  // Show billing toggle only when creator or deployment tiers are present
  const showBillingToggle = filteredTiers.some(tier => tier.id === "creator" || tier.id === "deployment");

  const isCancelled = _sub?.sub?.cancel_at_period_end;

  return (
    <div className="min-h-screen">
      <div className="px-4 mx-auto pb-20">
        {/* Header */}
        <div className="mx-auto max-w-6xl py-12">
          <h1 className="font-bold sm:text-5xl text-4xl text-gray-900 tracking-tight dark:text-zinc-200">
            Power your teams with Cloud Hosted ComfyUI
          </h1>
          <p className="leading-8 mt-4 text-lg text-gray-600 dark:text-zinc-400">
            We work closely with you to bring your workflow to your teams.
          </p>
        </div>

        {/* Pricing Section */}
        <div className="relative mx-auto max-w-7xl">
          {isCancelled && (
            <div className="py-6 px-4 bg-yellow-50 border-b border-yellow-200 w-full">
              <div className="flex items-start justify-between w-full max-w-5xl mx-auto">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.873-1.562 3.157-1.562 4.03 0l6.28 11.25c.873 1.562-.217 3.505-2.015 3.505H4.22c-1.798 0-2.888-1.943-2.015-3.505l6.28-11.25zm1.515 4.755v4h-1v-4h1zm-1 6v-1h1v1h-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Plan Cancellation Notice
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      Your plan will be cancelled at the end of the billing
                      period.
                    </div>
                  </div>
                </div>
                <UpgradeButton
                  plan={_sub?.sub?.plan}
                  href={`/checkout?plan=${_sub?.sub?.plan}`}
                  plans={_sub?.plans?.plans ?? []}
                  className="ml-8 flex-shrink-0"
                />
              </div>
            </div>
          )}
          {/* Billing period toggle - Positioned on top of pricing cards */}
          {showBillingToggle && (
            <div className="absolute -top-6 left-1/2 z-20 -translate-x-1/2">
              <motion.div
                className="inline-flex items-center rounded-full bg-white/95 p-0.5 shadow-md ring-1 ring-gray-200/50 backdrop-blur-sm dark:bg-zinc-900/95 dark:ring-zinc-700/50"
                layout
              >
                <motion.div layout className="relative">
                  <Button
                    variant="ghost"
                    onClick={() => setIsYearly(false)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                      !isYearly
                        ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50 dark:from-zinc-800 dark:to-zinc-700 dark:ring-zinc-700/50 dark:text-zinc-100"
                        : "text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700/50",
                    )}
                  >
                    Monthly
                  </Button>
                </motion.div>
                <motion.div className="relative">
                  <Button
                    variant="ghost"
                    onClick={() => setIsYearly(true)}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                      isYearly
                        ? "bg-gradient-to-b from-white to-gray-100 shadow-sm ring-1 ring-gray-200/50 dark:from-zinc-800 dark:to-zinc-700 dark:ring-zinc-700/50 dark:text-zinc-100"
                        : "text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700/50",
                    )}
                  >
                    Yearly
                    <AnimatePresence mode="wait">
                      <motion.div
                        className="inline-flex items-center overflow-hidden"
                        initial={{ width: 0, marginLeft: 0 }}
                        animate={{ width: "auto", marginLeft: "0.5rem" }}
                        exit={{ width: 0, marginLeft: 0 }}
                        transition={{
                          duration: 0.2,
                          ease: "easeInOut",
                        }}
                      >
                        <motion.span
                          className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600 whitespace-nowrap dark:bg-green-900/80 dark:text-green-300"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.1,
                            ease: "easeInOut",
                          }}
                        >
                          2 months free
                        </motion.span>
                      </motion.div>
                    </AnimatePresence>
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="relative z-10 overflow-hidden shadow-lg dark:shadow-2xl dark:shadow-zinc-900">
            {/* Free and Business Tiers Side by Side */}
            <div className="relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 border border-gray-200 dark:border-zinc-700">
                {/* Free Tier */}
                {filteredTiers.find((tier) => tier.id === "free") && (
                  <PricingTier
                    tier={filteredTiers.find((tier) => tier.id === "free")!}
                    isLoading={isLoading}
                    plans={_sub?.plans?.plans ?? []}
                    className={cn(
                      "lg:border-r bg-gradient-to-bl from-gray-50/10 via-gray-50/80 to-gray-100 dark:lg:border-zinc-700 dark:from-zinc-800/10 dark:via-zinc-800/80 dark:to-zinc-700",
                      (filteredTiers.some((tier) => tier.id === "creator") ||
                        filteredTiers.some((tier) => tier.id === "deployment"))
                        ? "rounded-tl-sm"
                        : "rounded-l-sm"
                    )}
                    isYearly={isYearly}
                    showCreatorTier={filteredTiers.some(
                      (tier) => tier.id === "creator",
                    )}
                    showDeploymentTier={filteredTiers.some(
                      (tier) => tier.id === "deployment",
                    )}
                    showBusinessUpgradeButton={showBusinessUpgradeButton}
                  />
                )}

                {/* Business Tier */}
                {filteredTiers.find((tier) => tier.id === "business") && (
                  <PricingTier
                    tier={filteredTiers.find((tier) => tier.id === "business")!}
                    isLoading={isLoading}
                    plans={_sub?.plans?.plans ?? []}
                    className={cn(
                      "bg-gradient-to-bl from-purple-50/10 via-purple-50/80 to-purple-100 dark:from-purple-900/10 dark:via-purple-900/30 dark:to-purple-800/50",
                      (filteredTiers.some((tier) => tier.id === "creator") ||
                        filteredTiers.some((tier) => tier.id === "deployment"))
                        ? "rounded-tr-sm"
                        : "rounded-r-sm"
                    )}
                    isYearly={isYearly}
                    showCreatorTier={filteredTiers.some(
                      (tier) => tier.id === "creator",
                    )}
                    showDeploymentTier={filteredTiers.some(
                      (tier) => tier.id === "deployment",
                    )}
                    showBusinessUpgradeButton={showBusinessUpgradeButton}
                  />
                )}
              </div>

              {/* Creator and Deployment Tiers */}
              {(filteredTiers.some((tier) => tier.id === "creator") ||
                filteredTiers.some((tier) => tier.id === "deployment")) && (
                  <div
                    className={cn(
                      "grid border border-gray-200 border-t-0 dark:border-zinc-700",
                      filteredTiers.some((tier) => tier.id === "creator") &&
                        filteredTiers.some((tier) => tier.id === "deployment")
                        ? "grid-cols-1 lg:grid-cols-2"
                        : "grid-cols-1",
                    )}
                  >
                    {filteredTiers.find((tier) => tier.id === "creator") && (
                      <PricingTier
                        tier={
                          filteredTiers.find((tier) => tier.id === "creator")!
                        }
                        isLoading={isLoading}
                        plans={_sub?.plans?.plans ?? []}
                        className={cn(
                          "bg-gradient-to-bl from-amber-50/10 via-amber-50/80 to-amber-100 dark:from-amber-900/10 dark:via-amber-900/30 dark:to-amber-800/50",
                          filteredTiers.some((tier) => tier.id === "deployment")
                            ? "rounded-bl-sm lg:border-r dark:lg:border-zinc-700"
                            : "rounded-b-sm",
                        )}
                        isYearly={isYearly}
                        showCreatorTier={filteredTiers.some(
                          (tier) => tier.id === "creator",
                        )}
                        showDeploymentTier={filteredTiers.some(
                          (tier) => tier.id === "deployment",
                        )}
                        showBusinessUpgradeButton={showBusinessUpgradeButton}
                      />
                    )}
                    {filteredTiers.find((tier) => tier.id === "deployment") && (
                      <PricingTier
                        tier={
                          filteredTiers.find((tier) => tier.id === "deployment")!
                        }
                        isLoading={isLoading}
                        plans={_sub?.plans?.plans ?? []}
                        className="rounded-br-sm bg-gradient-to-bl from-blue-50/10 via-blue-50/80 to-blue-100 dark:from-blue-900/10 dark:via-blue-900/30 dark:to-blue-800/50"
                        isYearly={isYearly}
                        showCreatorTier={filteredTiers.some(
                          (tier) => tier.id === "creator",
                        )}
                        showDeploymentTier={filteredTiers.some(
                          (tier) => tier.id === "deployment",
                        )}
                        showBusinessUpgradeButton={showBusinessUpgradeButton}
                      />
                    )}
                  </div>
                )}

            </div>

            <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] bg-white dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] dark:bg-zinc-900" />
          </div>
        </div>

        {/* GPU Pricing Table */}
        <GPUPricingTable />
      </div>
    </div>
  );
}
