"use client";

import { BoneyardTablePageSkeleton } from "@/components/boneyard-skeletons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { team as teamApi } from "@/lib/api";
import { useState } from "react";
import { PlusIcon, XIcon, MailIcon, ShieldIcon } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => teamApi.list(),
  });

  const [showInvite, setShowInvite] = useState(false);
  const members = (data?.data ?? []) as TeamMember[];

  if (isLoading) {
    return (
      <BoneyardTablePageSkeleton
        label="Team boneyard"
        showAction
        columns={3}
        rows={5}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and send invitations
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" /> Invite Member
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && members.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No team members</td></tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                    <ShieldIcon className="size-3" />
                    {m.role.replace("tenant_", "")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <InviteForm
          onClose={() => setShowInvite(false)}
          onSaved={() => {
            setShowInvite(false);
            queryClient.invalidateQueries({ queryKey: ["team"] });
          }}
        />
      )}
    </div>
  );
}

function InviteForm({ onClose, onSaved }: Readonly<{ onClose: () => void; onSaved: () => void }>) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("tenant_viewer");

  const mutation = useMutation({
    mutationFn: () => teamApi.invite({ email, role }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Invite Team Member</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><XIcon className="size-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="team-invite-email" className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input id="team-invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-9" placeholder="team@example.com" required />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="team-invite-role" className="text-sm font-medium">Role</label>
            <Select
              id="team-invite-role"
              value={role}
              onValueChange={(value) => setRole(value ?? "tenant_viewer")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="tenant_admin">Admin</SelectItem>
                  <SelectItem value="tenant_manager">Manager</SelectItem>
                  <SelectItem value="tenant_viewer">Viewer</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to send invitation"}
            </p>
          )}
          {mutation.isSuccess && <p className="text-sm text-green-600">Invitation sent!</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
