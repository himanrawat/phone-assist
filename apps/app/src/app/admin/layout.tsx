"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { BoneyardWorkspaceSkeleton } from "@/components/boneyard-skeletons";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();

  if (isLoading) {
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
