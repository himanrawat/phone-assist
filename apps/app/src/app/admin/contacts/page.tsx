"use client";

import { BoneyardTablePageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contacts as contactsApi } from "@/lib/api";
import { useState } from "react";
import {
  PlusIcon,
  XIcon,
  StarIcon,
  BanIcon,
  SearchIcon,
} from "lucide-react";
import type { Contact } from "@phone-assistant/contracts";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.list(),
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const contactsList = data?.data ?? [];
  const filtered = contactsList.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <BoneyardTablePageSkeleton
        label="Contacts boneyard"
        showAction
        showSearch
        columns={6}
        rows={6}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your known callers and customers
          </p>
        </div>
        <button
          onClick={() => { setEditingContact(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" /> Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Tags</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No contacts found</td>
              </tr>
            )}
            {filtered.map((contact) => (
              <tr
                key={contact.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => { setEditingContact(contact); setShowForm(true); }}
              >
                <td className="px-4 py-3 font-medium">{contact.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{contact.phone}</td>
                <td className="px-4 py-3 text-xs">{contact.email ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{contact.company ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags?.map((tag) => (
                      <span key={tag} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {contact.isVip && (
                      <span className="text-yellow-500" title="VIP">
                        <StarIcon className="size-4" />
                      </span>
                    )}
                    {contact.isBlocked && (
                      <span className="text-red-500" title="Blocked">
                        <BanIcon className="size-4" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["contacts"] });
          }}
        />
      )}
    </div>
  );
}

function ContactForm({
  contact,
  onClose,
  onSaved,
}: Readonly<{
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}>) {
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    company: contact?.company ?? "",
    tags: contact?.tags?.join(", ") ?? "",
    isVip: contact?.isVip ?? false,
    isBlocked: contact?.isBlocked ?? false,
    notes: contact?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        company: form.company || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        isVip: form.isVip,
        isBlocked: form.isBlocked,
        notes: form.notes || undefined,
      };
      if (contact) {
        return contactsApi.update(contact.id, payload);
      }
      return contactsApi.create(payload);
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">
            {contact ? "Edit Contact" : "New Contact"}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <XIcon className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="contact-name" className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <input id="contact-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-phone" className="text-sm font-medium">Phone <span className="text-destructive">*</span></label>
              <input id="contact-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
              <input id="contact-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
            <div className="space-y-1">
              <label htmlFor="contact-company" className="text-sm font-medium">Company</label>
              <input id="contact-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="contact-tags" className="text-sm font-medium">Tags (comma-separated)</label>
            <input id="contact-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="vip, returning" />
          </div>
          <div className="space-y-1">
            <label htmlFor="contact-notes" className="text-sm font-medium">Notes</label>
            <textarea id="contact-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" />
          </div>
          <div className="flex gap-6">
            <label htmlFor="contact-vip" className="flex items-center gap-2 text-sm">
              <input id="contact-vip" type="checkbox" checked={form.isVip} onChange={(e) => setForm({ ...form, isVip: e.target.checked })} className="rounded" />
              <span>VIP</span>
            </label>
            <label htmlFor="contact-blocked" className="flex items-center gap-2 text-sm">
              <input id="contact-blocked" type="checkbox" checked={form.isBlocked} onChange={(e) => setForm({ ...form, isBlocked: e.target.checked })} className="rounded" />
              <span>Blocked</span>
            </label>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to save"}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
