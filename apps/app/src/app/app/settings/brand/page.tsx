"use client";

import { BoneyardFormPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brand as brandApi } from "@/lib/api";
import { cloneElement, isValidElement, useEffect, useId, useState } from "react";
import { SaveIcon, PlusIcon, TrashIcon } from "lucide-react";

type BrandAddress = { label: string; address: string; phone?: string };
type BrandService = { name: string; description: string; price?: string; duration?: string };
type BrandFaq = { question: string; answer: string };
type BrandStaffMember = { name: string; role: string; department?: string; specialty?: string };
type BrandEscalationRule = { trigger: string; action: string };
type EditableItem<T> = T & { id: string };

interface BrandFormState {
  businessName: string;
  tagline: string;
  industry: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  addresses: BrandAddress[];
  services: Array<EditableItem<BrandService>>;
  policies: Array<{ title: string; content: string }>;
  faqs: Array<EditableItem<BrandFaq>>;
  staff: BrandStaffMember[];
  brandVoice: {
    toneKeywords: string[];
    wordsToUse: string[];
    wordsToAvoid: string[];
    samplePhrases: string[];
  };
  escalationRules: Array<EditableItem<BrandEscalationRule>>;
}

function createRowId() {
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

function addRowIds<T extends object>(items: T[] | undefined): Array<EditableItem<T>> {
  return (items ?? []).map((item) => ({ ...item, id: createRowId() }));
}

function stripRowIds<T extends object>(items: Array<EditableItem<T>>): T[] {
  return items.map(({ id: _id, ...item }) => item as T);
}

export default function BrandSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["brand"],
    queryFn: () => brandApi.get(),
  });

  const [form, setForm] = useState<BrandFormState>({
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
    brandVoice: {
      toneKeywords: [],
      wordsToUse: [],
      wordsToAvoid: [],
      samplePhrases: [],
    },
    escalationRules: [],
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
        services: addRowIds(data.data.services),
        policies: data.data.policies ?? [],
        faqs: addRowIds(data.data.faqs),
        staff: data.data.staff ?? [],
        brandVoice: data.data.brandVoice ?? {
          toneKeywords: [],
          wordsToUse: [],
          wordsToAvoid: [],
          samplePhrases: [],
        },
        escalationRules: addRowIds(data.data.escalationRules),
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: BrandFormState) =>
      brandApi.update({
        ...payload,
        services: stripRowIds(payload.services),
        faqs: stripRowIds(payload.faqs),
        escalationRules: stripRowIds(payload.escalationRules),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand"] }),
  });

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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
        className="space-y-8"
      >
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
          {form.services.map((service, index) => (
            <div key={service.id} className="flex gap-2 items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-4">
                <input placeholder="Name" value={service.name} onChange={(e) => { const nextServices = [...form.services]; nextServices[index] = { ...nextServices[index], name: e.target.value }; setForm({ ...form, services: nextServices }); }} className="input-field" />
                <input placeholder="Description" value={service.description} onChange={(e) => { const nextServices = [...form.services]; nextServices[index] = { ...nextServices[index], description: e.target.value }; setForm({ ...form, services: nextServices }); }} className="input-field" />
                <input placeholder="Price" value={service.price ?? ""} onChange={(e) => { const nextServices = [...form.services]; nextServices[index] = { ...nextServices[index], price: e.target.value }; setForm({ ...form, services: nextServices }); }} className="input-field" />
                <input placeholder="Duration" value={service.duration ?? ""} onChange={(e) => { const nextServices = [...form.services]; nextServices[index] = { ...nextServices[index], duration: e.target.value }; setForm({ ...form, services: nextServices }); }} className="input-field" />
              </div>
              <button type="button" onClick={() => setForm({ ...form, services: form.services.filter((item) => item.id !== service.id) })} className="mt-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, services: [...form.services, { id: createRowId(), name: "", description: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <PlusIcon className="size-4" /> Add service
          </button>
        </Section>

        {/* FAQs */}
        <Section title="FAQs">
          {form.faqs.map((faq, index) => (
            <div key={faq.id} className="flex gap-2 items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input placeholder="Question" value={faq.question} onChange={(e) => { const nextFaqs = [...form.faqs]; nextFaqs[index] = { ...nextFaqs[index], question: e.target.value }; setForm({ ...form, faqs: nextFaqs }); }} className="input-field" />
                <input placeholder="Answer" value={faq.answer} onChange={(e) => { const nextFaqs = [...form.faqs]; nextFaqs[index] = { ...nextFaqs[index], answer: e.target.value }; setForm({ ...form, faqs: nextFaqs }); }} className="input-field" />
              </div>
              <button type="button" onClick={() => setForm({ ...form, faqs: form.faqs.filter((item) => item.id !== faq.id) })} className="mt-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, faqs: [...form.faqs, { id: createRowId(), question: "", answer: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <PlusIcon className="size-4" /> Add FAQ
          </button>
        </Section>

        {/* Escalation Rules */}
        <Section title="Escalation Rules">
          {form.escalationRules.map((rule, index) => (
            <div key={rule.id} className="flex gap-2 items-start">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input placeholder="Trigger" value={rule.trigger} onChange={(e) => { const nextRules = [...form.escalationRules]; nextRules[index] = { ...nextRules[index], trigger: e.target.value }; setForm({ ...form, escalationRules: nextRules }); }} className="input-field" />
                <input placeholder="Action" value={rule.action} onChange={(e) => { const nextRules = [...form.escalationRules]; nextRules[index] = { ...nextRules[index], action: e.target.value }; setForm({ ...form, escalationRules: nextRules }); }} className="input-field" />
              </div>
              <button type="button" onClick={() => setForm({ ...form, escalationRules: form.escalationRules.filter((item) => item.id !== rule.id) })} className="mt-1 rounded p-1.5 text-destructive hover:bg-destructive/10">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, escalationRules: [...form.escalationRules, { id: createRowId(), trigger: "", action: "" }] })} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
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

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-4 rounded-lg border p-6">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  const fieldId = useId();
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? fieldId })
    : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {control}
    </div>
  );
}
