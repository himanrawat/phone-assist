"use client";

import { BoneyardWorkspaceSkeleton } from "@/components/boneyard-skeletons";
import { PlatformSidebar } from "@/components/platform-sidebar";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !user.platformRole)) {
      router.replace("/admin/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user?.platformRole) {
    return <BoneyardWorkspaceSkeleton mode="platform" />;
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
