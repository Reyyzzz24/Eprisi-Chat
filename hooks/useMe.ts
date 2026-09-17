"use client";

import { useQuery } from "@tanstack/react-query";

import { rcRest } from "@/lib/rc/rest";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => rcRest.me(),
    staleTime: 60_000,
  });
}
