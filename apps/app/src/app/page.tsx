"use client";

import { BoneyardAuthSkeleton } from "@/components/boneyard-skeletons";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const { user, tenant, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.platformRole) {
      router.replace("/platform/dashboard");
    } else if (tenant) {
      router.replace("/app/dashboard");
    } else {
      router.replace("/login");
    }
  }, [user, tenant, isLoading, router]);

  return <BoneyardAuthSkeleton />;
}
