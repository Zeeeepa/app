import { useAuth, useOrganization, useUser } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/react";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { GlobalErrorDialog } from "@/components/global-error-dialog";
import { api } from "./api";
import { isApiError } from "./api-error";
import { useAuthStore } from "./auth-store";

function PostHogUserIdentify() {
  const posthog = usePostHog();
  const auth = useAuth();
  const { user, isSignedIn } = useUser();
  const { organization } = useOrganization();

  useEffect(() => {
    if (!posthog || !process.env.VITE_PUBLIC_POSTHOG_KEY) return;

    posthog.setPersonPropertiesForFlags({
      org_id: organization?.id ?? null,
      org_name: organization?.name ?? null,
    });
  }, [organization?.id]);

  useEffect(() => {
    if (!posthog || !process.env.VITE_PUBLIC_POSTHOG_KEY) return;

    const userProperties = {
      email: user?.primaryEmailAddress?.emailAddress,
      name: user?.fullName,
      org_id: organization?.id ?? null,
      org_name: organization?.name ?? null,
    };
    posthog.identify(auth.userId || undefined, userProperties || undefined);
  }, [auth.userId, isSignedIn, organization?.id]);

  return <></>;
}

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

// Current not used can be enabled via middleware to avoid flickering feature flag with server side bootstrap
const flags = getCookie("bootstrapData");

let bootstrapData = {};
if (flags) {
  try {
    bootstrapData = JSON.parse(decodeURIComponent(flags));
  } catch (e) {
    console.error("Failed to parse bootstrapData cookie", e);
  }
}

// Only initialize PostHog if the key is provided
if (process.env.VITE_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.VITE_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true, // Enable pageleave capture
    debug: process.env.NODE_ENV === "development", // Enable debug mode in development
    autocapture: {
      // Disable autocapture of form inputs for privacy
      capture_copied_text: false,
    },
    session_recording: {
      // Configure session recording (can be controlled via feature flags)
      maskAllInputs: true,
    },
    bootstrap: bootstrapData,
    loaded: (posthog) => {
      // Additional setup after PostHog is loaded
      if (process.env.NODE_ENV === "development") {
        console.log("PostHog loaded successfully");
      }
    },
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count: number, error: Error) => {
        if (isApiError(error) && error.status === 403) return false;
        if (isApiError(error) && error.status === 404) return false;
        if (error.message.includes("403")) return false;

        if (error.message.includes("Waiting for auth to be online")) {
          return true;
        }

        // console.log(count, error);
        return count < 2;
      },
      queryFn: async ({ queryKey, pageParam, meta }) => {
        if (meta?.method === "POST") {
          return await api({
            url: queryKey.join("/"),
            params: meta?.params as Record<string, any> | undefined,
            init: {
              method: "POST",
              body: JSON.stringify(meta?.body),
            },
          });
        }

        let finalQuery = "";

        if (meta?.params && Object.values(meta.params).some(Array.isArray)) {
          const queryString = Object.entries(meta.params)
            .flatMap(([key, value]) => {
              if (value === undefined) return []; // Skip undefined values
              return Array.isArray(value)
                ? value.map(
                    (v) =>
                      `${encodeURIComponent(key)}=${encodeURIComponent(v)}`,
                  )
                : `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .filter(Boolean) // Remove any empty strings that might result from the flatMap
            .join("&");

          finalQuery = queryString;
          const offset = pageParam !== undefined ? pageParam : meta?.offset;
          finalQuery = `offset=${offset}&${queryString}`;
          if (meta?.limit) {
            finalQuery = `limit=${meta.limit}&${finalQuery}`;
          }

          return await api({
            url: queryKey.join("/"),
            params: finalQuery,
          });
        }

        return await api({
          url: queryKey.join("/"),
          params: meta
            ? {
                offset: pageParam !== undefined ? pageParam : meta?.offset,
                limit: meta?.limit,
                ...(meta?.params || {}),
              }
            : undefined,
        });
      },
    },
    // mutations: {

    // },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const { getToken, sessionId } = useAuth();

  useEffect(() => {
    // console.log("sessionId", sessionId);
    useAuthStore.setState({
      fetchToken: getToken,
    });

    getToken().then((token) => {
      useAuthStore.setState({
        token: token,
      });
    });
  }, [getToken, sessionId]);

  return (
    <PostHogProvider client={posthog}>
      <NuqsAdapter>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={true} />
          <PostHogUserIdentify />
          <GlobalErrorDialog />
          {children}
        </QueryClientProvider>
      </NuqsAdapter>
    </PostHogProvider>
  );
}
