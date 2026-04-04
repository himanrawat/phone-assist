"use client";

import { BoneyardFormPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brand as brandApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { SaveIcon, PlusIcon, TrashIcon } from "lucide-react";

export default function BrandSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["brand"],
    queryFn: () => brandApi.get(),
  });

  const [form, setForm] = useState({
    businessName: "",
    tagline: "",
    industry: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    addresses: [] as Array<{ label: string; address: string; phone?: string }>,
    services: [] as Array<{ name: string; description: string; price?: string; duration?: string }>,
    policies: [] as Array<{ title: string; content: string }>,
    faqs: [] as Array<{ question: string; answer: string }>,
    staff: [] as Array<{ name: string; role: string; department?: string; specialty?: string }>,
    brandVoice: {
      toneKeywords: [] as string[],
      wordsToUse: [] as string[],
      wordsToAvoid: [] as string[],
      samplePhrases: [] as string[],
    },
    escalationRules: [] as Array<{ trigger: string; action: string }>,
  });

  useEffect(() => {
    if (data?.data) {
      setForm({
        businessName: data.data.businessName ?? "",
        tagline: data.data.tagline ?? "",
        industry: data.data.industry ?? "",
        description: data.data.description ?? "",
        website: data.data.website ?? "",
        email: data.data.email ?? "",
        phone: data.data.phone ?? "",
        addresses: data.data.addresses ?? [],
        services: data.data.services ?? [],
        policies: data.data.policies ?? [],
        faqs: data.data.faqs ?? [],
        staff: data.data.staff ?? [],
        brandVoice: data.data.brandVoice ?? {
          toneKeywords: [],
          wordsToUse: [],
          wordsToAvoid: [],
          samplePhrases: [],
        },
        escalationRules: data.data.escalationRules ?? [],
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: typeof form) => brandApi.update(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  if (isLoading) {
    return <BoneyardFormPageSkeleton label="Brand boneyard" sections={3} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Brand Profile</h1>
        <p className="text-sm text-muted-foreground">
          Configure your business brand profile for the AI assistant
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <Section title="Basic Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business Name" required>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="input-field"
                required
              />
            </Field>
            <Field label="Tagline">
              <input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Industry">
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Website">
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field"
            />
          </Field>
        </Section>

        {/* Services */}
        <Section title="Services">
          {form.services.map((svc, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-4">
                <input placeholder="Name" value={svc.name} onChange={(e) => { const s = [...form.services]; s[i] = { ...s[i], name: e.target.value }; setForm({ ...form, services: s }); }} className="input-field" />
                <input placeholder="Description" value={svc.description} onChange={(e) => { const s = [...form.services]; s[i] = { ...s[i], description: e.target.value }; setForm({ ...form, services: s }); }} className="input-field" />
                <input placeholder="Price" value={svc.price ?? ""} onChange={(e) => { const s = [...form.services]; s[i] = { ...s[i], price: e.target.value }; setForm({ ...form, services: s }); }} className="input-field" />
                <input placeholder="Duration" value={svc.duration ?? ""} onChange={(e) => { const s = [...form.services]; s[i] = { ...s[i], duration: e.target.value }; setForm({ ...form, services: s }); }} className="input-field" />
              </div>
              <button type="button" onClick={() => setForm({ ...form, services: form.services.filter((_, j) => j !== i) })} className="mt-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, services: [...form.services, { name: "", description: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <PlusIcon className="size-4" /> Add service
          </button>
        </Section>

        {/* FAQs */}
        <Section title="FAQs">
          {form.faqs.map((faq, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input placeholder="Question" value={faq.question} onChange={(e) => { const f = [...form.faqs]; f[i] = { ...f[i], question: e.target.value }; setForm({ ...form, faqs: f }); }} className="input-field" />
                <input placeholder="Answer" value={faq.answer} onChange={(e) => { const f = [...form.faqs]; f[i] = { ...f[i], answer: e.target.value }; setForm({ ...form, faqs: f }); }} className="input-field" />
              </div>
              <button type="button" onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, j) => j !== i) })} className="mt-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, faqs: [...form.faqs, { question: "", answer: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <PlusIcon className="size-4" /> Add FAQ
          </button>
        </Section>

        {/* Escalation Rules */}
        <Section title="Escalation Rules">
          {form.escalationRules.map((rule, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input placeholder="Trigger" value={rule.trigger} onChange={(e) => { const r = [...form.escalationRules]; r[i] = { ...r[i], trigger: e.target.value }; setForm({ ...form, escalationRules: r }); }} className="input-field" />
                <input placeholder="Action" value={rule.action} onChange={(e) => { const r = [...form.escalationRules]; r[i] = { ...r[i], action: e.target.value }; setForm({ ...form, escalationRules: r }); }} className="input-field" />
              </div>
              <button type="button" onClick={() => setForm({ ...form, escalationRules: form.escalationRules.filter((_, j) => j !== i) })} className="mt-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, escalationRules: [...form.escalationRules, { trigger: "", action: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <PlusIcon className="size-4" /> Add rule
          </button>
        </Section>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <SaveIcon className="size-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {mutation.isSuccess && (
            <span className="text-sm text-green-600">Saved successfully</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Save failed"}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
