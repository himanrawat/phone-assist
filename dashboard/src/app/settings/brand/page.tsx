"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBrandProfile,
  updateBrandProfile,
  type BrandProfile,
  type BrandProfileResponse,
  type BrandAddress,
  type BrandService,
  type BrandPolicy,
  type BrandFAQ,
  type BrandStaff,
  type BrandVoice,
  type BrandEscalationRule,
} from "@/lib/api";
import { useState, useEffect } from "react";

type FormState = {
  businessName: string;
  tagline: string;
  industry: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  addresses: BrandAddress[];
  services: BrandService[];
  policies: BrandPolicy[];
  faqs: BrandFAQ[];
  staff: BrandStaff[];
  brandVoice: BrandVoice;
  escalationRules: BrandEscalationRule[];
};

const emptyForm: FormState = {
  businessName: "",
  tagline: "",
  industry: "",
  description: "",
  website: "",
  email: "",
  phone: "",
  addresses: [],
  services: [],
  policies: [],
  faqs: [],
  staff: [],
  brandVoice: { toneKeywords: [], wordsToUse: [], wordsToAvoid: [], samplePhrases: [] },
  escalationRules: [],
};

function profileToForm(p: BrandProfile): FormState {
  return {
    businessName: p.businessName,
    tagline: p.tagline || "",
    industry: p.industry || "",
    description: p.description || "",
    website: p.website || "",
    email: p.email || "",
    phone: p.phone || "",
    addresses: p.addresses || [],
    services: p.services || [],
    policies: p.policies || [],
    faqs: p.faqs || [],
    staff: p.staff || [],
    brandVoice: p.brandVoice || emptyForm.brandVoice,
    escalationRules: p.escalationRules || [],
  };
}

export default function BrandSettingsPage() {
  const queryClient = useQueryClient();
  const [tenantIdInput, setTenantIdInput] = useState("");
  const [activeTenantId, setActiveTenantId] = useState<string | undefined>(undefined);
  const brandQueryKey = ["brand", activeTenantId || "__default__"];

  const { data, error: queryError, isLoading } = useQuery({
    queryKey: brandQueryKey,
    queryFn: () => getBrandProfile(activeTenantId),
  });

  const mutation = useMutation({
    mutationFn: (form: FormState) => updateBrandProfile(activeTenantId, form),
    onSuccess: (response) => {
      queryClient.setQueryData<BrandProfileResponse>(brandQueryKey, response);
      queryClient.invalidateQueries({ queryKey: brandQueryKey });
    },
  });

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (data.data) {
      setForm(profileToForm(data.data));
      return;
    }

    setForm(emptyForm);
  }, [data]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleLoad() {
    const nextTenantId = tenantIdInput.trim() || undefined;
    mutation.reset();
    setActiveTenantId(nextTenantId);
    queryClient.invalidateQueries({ queryKey: ["brand", nextTenantId || "__default__"] });
  }

  function handleSave() {
    mutation.mutate(form);
  }

  const resolvedTenant = mutation.data?.tenant || data?.tenant;
  const loadErrorMessage = queryError instanceof Error ? queryError.message : null;
  const errorMessage = mutation.error instanceof Error ? mutation.error.message : "Unknown error";

  if (isLoading) return <p className="text-gray-500 p-4">Loading brand profile...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define your business identity. This information trains the AI assistant to represent your brand accurately on every call.
          </p>
        </div>
      </div>

      {/* Tenant ID input */}
      <div className="mb-6 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tenantIdInput}
            onChange={(e) => setTenantIdInput(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Optional for now. Leave blank to use the default tenant."
          />
          <button
            onClick={handleLoad}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Load
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          In Phase 1, leaving this blank uses the first available tenant. In Phase 2, it will come from the login session.
        </p>
        {resolvedTenant && (
          <p className="text-xs text-gray-500 mt-2">
            {activeTenantId ? "Loaded tenant" : "Using default tenant"}: {resolvedTenant.name} ({resolvedTenant.id})
          </p>
        )}
        {loadErrorMessage && <p className="text-xs text-red-600 mt-2">Failed to load tenant: {loadErrorMessage}</p>}
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Business Identity */}
        <Section title="Business Identity" description="Core information about your business.">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Business Name *" value={form.businessName} onChange={(v) => updateField("businessName", v)} />
            <Input label="Industry" value={form.industry} onChange={(v) => updateField("industry", v)} placeholder="e.g. healthcare, restaurant, salon" />
            <Input label="Tagline" value={form.tagline} onChange={(v) => updateField("tagline", v)} className="col-span-2" />
            <Textarea label="Description" value={form.description} onChange={(v) => updateField("description", v)} className="col-span-2" placeholder="What does your business do? The AI will use this to introduce and describe your business." />
            <Input label="Website" value={form.website} onChange={(v) => updateField("website", v)} />
            <Input label="Email" value={form.email} onChange={(v) => updateField("email", v)} />
            <Input label="Phone" value={form.phone} onChange={(v) => updateField("phone", v)} />
          </div>
        </Section>

        {/* Locations */}
        <Section title="Locations" description="Physical addresses of your business.">
          <ListEditor
            items={form.addresses}
            onChange={(v) => updateField("addresses", v)}
            renderItem={(item, update) => (
              <div className="grid grid-cols-3 gap-3">
                <Input label="Label" value={item.label} onChange={(v) => update({ ...item, label: v })} placeholder="Main Branch" />
                <Input label="Address" value={item.address} onChange={(v) => update({ ...item, address: v })} className="col-span-2" />
                <Input label="Phone (optional)" value={item.phone || ""} onChange={(v) => update({ ...item, phone: v || undefined })} />
              </div>
            )}
            newItem={(): BrandAddress => ({ label: "", address: "" })}
            addLabel="Add Location"
          />
        </Section>

        {/* Services */}
        <Section title="Services / Products" description="What you offer. The AI will reference this when callers ask about services or pricing.">
          <ListEditor
            items={form.services}
            onChange={(v) => updateField("services", v)}
            renderItem={(item, update) => (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name" value={item.name} onChange={(v) => update({ ...item, name: v })} />
                <Input label="Description" value={item.description} onChange={(v) => update({ ...item, description: v })} />
                <Input label="Price (optional)" value={item.price || ""} onChange={(v) => update({ ...item, price: v || undefined })} placeholder="e.g. $100, From $50" />
                <Input label="Duration (optional)" value={item.duration || ""} onChange={(v) => update({ ...item, duration: v || undefined })} placeholder="e.g. 30 min" />
              </div>
            )}
            newItem={(): BrandService => ({ name: "", description: "" })}
            addLabel="Add Service"
          />
        </Section>

        {/* Policies */}
        <Section title="Policies" description="Cancellation, refund, insurance, or other policies callers frequently ask about.">
          <ListEditor
            items={form.policies}
            onChange={(v) => updateField("policies", v)}
            renderItem={(item, update) => (
              <div className="grid grid-cols-1 gap-3">
                <Input label="Title" value={item.title} onChange={(v) => update({ ...item, title: v })} placeholder="e.g. Cancellation Policy" />
                <Textarea label="Content" value={item.content} onChange={(v) => update({ ...item, content: v })} />
              </div>
            )}
            newItem={(): BrandPolicy => ({ title: "", content: "" })}
            addLabel="Add Policy"
          />
        </Section>

        {/* FAQs */}
        <Section title="FAQs" description="Common questions and answers. The AI will use these for direct, accurate responses.">
          <ListEditor
            items={form.faqs}
            onChange={(v) => updateField("faqs", v)}
            renderItem={(item, update) => (
              <div className="grid grid-cols-1 gap-3">
                <Input label="Question" value={item.question} onChange={(v) => update({ ...item, question: v })} />
                <Textarea label="Answer" value={item.answer} onChange={(v) => update({ ...item, answer: v })} />
              </div>
            )}
            newItem={(): BrandFAQ => ({ question: "", answer: "" })}
            addLabel="Add FAQ"
          />
        </Section>

        {/* Staff */}
        <Section title="Staff Directory" description="Key team members. The AI can route callers or mention staff by name.">
          <ListEditor
            items={form.staff}
            onChange={(v) => updateField("staff", v)}
            renderItem={(item, update) => (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name" value={item.name} onChange={(v) => update({ ...item, name: v })} />
                <Input label="Role" value={item.role} onChange={(v) => update({ ...item, role: v })} />
                <Input label="Department (optional)" value={item.department || ""} onChange={(v) => update({ ...item, department: v || undefined })} />
                <Input label="Specialty (optional)" value={item.specialty || ""} onChange={(v) => update({ ...item, specialty: v || undefined })} />
              </div>
            )}
            newItem={(): BrandStaff => ({ name: "", role: "" })}
            addLabel="Add Staff Member"
          />
        </Section>

        {/* Brand Voice */}
        <Section title="Brand Voice" description="Control how the AI sounds. These shape the assistant's vocabulary and tone.">
          <div className="space-y-4">
            <TagInput label="Tone Keywords" value={form.brandVoice.toneKeywords} onChange={(v) => updateField("brandVoice", { ...form.brandVoice, toneKeywords: v })} placeholder="e.g. professional, warm, empathetic" />
            <TagInput label="Preferred Words/Phrases" value={form.brandVoice.wordsToUse} onChange={(v) => updateField("brandVoice", { ...form.brandVoice, wordsToUse: v })} placeholder="e.g. happy to help, absolutely" />
            <TagInput label="Words/Phrases to Avoid" value={form.brandVoice.wordsToAvoid} onChange={(v) => updateField("brandVoice", { ...form.brandVoice, wordsToAvoid: v })} placeholder="e.g. unfortunately, can't" />
            <TagInput label="Sample Phrases" value={form.brandVoice.samplePhrases} onChange={(v) => updateField("brandVoice", { ...form.brandVoice, samplePhrases: v })} placeholder="Type a phrase and press Enter" />
          </div>
        </Section>

        {/* Escalation Rules */}
        <Section title="Escalation Rules" description="When should the AI stop handling the call and take a different action?">
          <ListEditor
            items={form.escalationRules}
            onChange={(v) => updateField("escalationRules", v)}
            renderItem={(item, update) => (
              <div className="grid grid-cols-1 gap-3">
                <Input label="Trigger" value={item.trigger} onChange={(v) => update({ ...item, trigger: v })} placeholder="e.g. Caller asks for a manager" />
                <Input label="Action" value={item.action} onChange={(v) => update({ ...item, action: v })} placeholder="e.g. Transfer to front desk" />
              </div>
            )}
            newItem={(): BrandEscalationRule => ({ trigger: "", action: "" })}
            addLabel="Add Rule"
          />
        </Section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={mutation.isPending || !form.businessName}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Saving..." : "Save Brand Profile"}
          </button>
          {mutation.isSuccess && <p className="text-green-600 text-sm">Brand profile saved successfully.</p>}
          {mutation.isError && <p className="text-red-600 text-sm">Failed to save: {errorMessage}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Reusable sub-components ───

function Section({ title, description, children }: Readonly<{ title: string; description: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, className }: Readonly<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }>) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, className }: Readonly<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }>) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function TagInput({ label, value, onChange, placeholder }: Readonly<{ label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }>) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onChange([...value, input.trim()]);
      setInput("");
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
            {tag}
            <button onClick={() => remove(i)} className="text-blue-400 hover:text-blue-700">&times;</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function ListEditor<T>({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel,
}: Readonly<{
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, update: (item: T) => void, index: number) => React.ReactNode;
  newItem: () => T;
  addLabel: string;
}>) {
  function updateItem(index: number, updated: T) {
    const next = [...items];
    next[index] = updated;
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="relative rounded-lg border border-gray-100 bg-gray-50 p-4">
          <button
            onClick={() => removeItem(i)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm"
          >
            &times;
          </button>
          {renderItem(item, (updated) => updateItem(i, updated), i)}
        </div>
      ))}
      <button
        onClick={() => onChange([...items, newItem()])}
        className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        + {addLabel}
      </button>
    </div>
  );
}
