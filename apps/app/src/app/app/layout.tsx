"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { BoneyardWorkspaceSkeleton } from "@/components/boneyard-skeletons";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      return;
    }

    if (!tenant) {
      router.replace("/login");
    }
  }, [user, tenant, isLoading, router]);

  if (isLoading || !tenant || user?.platformRole) {
    return <BoneyardWorkspaceSkeleton mode="admin" />;
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
