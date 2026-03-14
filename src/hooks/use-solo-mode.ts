"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";

type Org = {
  id: string;
  name: string;
  isPersonal?: boolean;
  _count: { members: number; projects: number };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSoloMode() {
  const { data: session } = useSession();
  const { data: orgs, isLoading } = useSWR<Org[]>(
    session?.user?.id ? "/api/orgs" : null,
    fetcher
  );

  const currentOrg = orgs?.find((o) => o.id === session?.user?.orgId);

  return {
    isSolo: orgs ? orgs.length === 1 : false,
    isPersonalOrg: currentOrg?.isPersonal ?? false,
    memberCount: currentOrg?._count?.members ?? 1,
    isLoading,
  };
}
