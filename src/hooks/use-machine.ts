import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

const BATCH_SIZE = 20;

export function useMachines(debouncedSearchValue?: string) {
  return useInfiniteQuery<any[]>({
    queryKey: ["machines"],
    meta: {
      limit: BATCH_SIZE,
      offset: 0,
      params: {
        search: debouncedSearchValue ?? "",
        is_deleted: false,
      },
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.length === BATCH_SIZE
        ? allPages?.length * BATCH_SIZE
        : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 5000,
  });
}

export function useMachinesAll() {
  return useQuery<any[]>({
    queryKey: ["machines", "all"],
    refetchInterval: 5000,
  });
}

export function useMachine(machine_id?: string) {
  return useQuery<any>({
    enabled: !!machine_id,
    queryKey: ["machine", machine_id],
  });
}

export function useMachineEvents(machine_id: string) {
  return useQuery<any[]>({
    queryKey: ["machine", machine_id, "events"],
    refetchInterval: 5000,
  });
}

export function useMachineVersions(machine_id: string) {
  return useInfiniteQuery<any[]>({
    queryKey: ["machine", "serverless", machine_id, "versions"],
    meta: {
      limit: BATCH_SIZE,
      offset: 0,
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage?.length === BATCH_SIZE
        ? allPages?.length * BATCH_SIZE
        : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 5000,
  });
}

export function useMachineVersionsAll(machine_id: string) {
  return useQuery<any[]>({
    queryKey: ["machine", "serverless", machine_id, "versions", "all"],
    refetchInterval: 5000,
  });
}

export function useMachineVersion(
  machine_id: string,
  machine_version_id: string,
) {
  return useQuery<any>({
    enabled: !!machine_id && !!machine_version_id,
    queryKey: [
      "machine",
      "serverless",
      machine_id,
      "versions",
      machine_version_id,
    ],
  });
}
