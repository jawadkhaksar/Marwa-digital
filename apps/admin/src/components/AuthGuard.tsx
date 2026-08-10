"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // Token check needs localStorage (client-only) — this can't run any
    // earlier than an effect, and the redirect branch above has to stay in
    // an effect regardless, so there's no clean external-store split here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
