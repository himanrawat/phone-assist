import { cn } from "@/lib/utils";
import { PhoneIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

function Skeleton({
  className,
  ...props
}: Readonly<ComponentProps<"div">>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

const TABLE_WIDTHS = [
  "w-12",
  "w-16",
  "w-20",
  "w-24",
  "w-28",
  "w-32",
  "w-40",
  "w-48",
];

function createBoneyardIds(prefix: string, count: number) {
  return Array.from({ length: count }, (_, slot) => `${prefix}-${slot}`);
}

function sidebarLabelWidth(index: number) {
  const widthMap = ["w-24", "w-20", "w-28"];

  return widthMap[index % widthMap.length];
}

function BoneyardCanvas({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "bg-[radial-gradient(circle_at_top_left,rgba(0,237,100,0.08),transparent_22%),linear-gradient(180deg,rgba(0,30,43,0.06),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(0,237,100,0.12),transparent_26%),linear-gradient(180deg,rgba(0,237,100,0.03),transparent_38%)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function BoneyardPanel({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-[0_24px_80px_-48px_rgba(0,30,43,0.35)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,237,100,0.04),transparent_45%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function BoneyardStamp({ label }: Readonly<{ label: string }>) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
      <span className="flex size-5 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
        <PhoneIcon className="size-3" />
      </span>
      {label}
    </div>
  );
}

function BoneyardPageIntro({
  label,
  titleWidth = "w-72",
  subtitleWidth = "w-[28rem]",
  action,
}: Readonly<{
  label: string;
  titleWidth?: string;
  subtitleWidth?: string;
  action?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <BoneyardStamp label={label} />
        <Skeleton className={cn("h-10 max-w-full rounded-full", titleWidth)} />
        <Skeleton className={cn("h-4 max-w-full rounded-full", subtitleWidth)} />
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function BoneyardTableGrid({
  columns,
  rows,
}: Readonly<{
  columns: number;
  rows: number;
}>) {
  const headerIds = createBoneyardIds("header", columns);
  const rowIds = createBoneyardIds("row", rows);
  const columnIds = createBoneyardIds("column", columns);

  return (
    <BoneyardPanel className="overflow-hidden">
      <div
        className="grid gap-3 border-b border-border/70 px-4 py-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {headerIds.map((headerId, headerIndex) => (
          <Skeleton
            key={headerId}
            className={cn(
              "h-3 rounded-full",
              TABLE_WIDTHS[(headerIndex + 2) % TABLE_WIDTHS.length]
            )}
          />
        ))}
      </div>
      {rowIds.map((rowId, rowIndex) => (
        <div
          key={rowId}
          className="grid gap-3 border-b border-border/50 px-4 py-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {columnIds.map((columnId, columnIndex) => (
            <Skeleton
              key={`${rowId}-${columnId}`}
              className={cn(
                "h-4 rounded-full",
                TABLE_WIDTHS[(rowIndex + columnIndex) % TABLE_WIDTHS.length]
              )}
            />
          ))}
        </div>
      ))}
    </BoneyardPanel>
  );
}

function BoneyardSidebar({
  mode,
}: Readonly<{ mode: "admin" | "platform" }>) {
  const navIds = createBoneyardIds("nav", 7);

  return (
    <aside className="hidden h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-green">
          <PhoneIcon className="size-4 text-brand-forest" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-24 bg-sidebar-accent" />
          <Skeleton className="h-2.5 w-14 bg-sidebar-accent/70" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-3">
        <BoneyardStamp label={`${mode} boneyard`} />
        {navIds.map((navId, navIndex) => (
          <div
            key={navId}
            className="flex items-center gap-3 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/30 px-3 py-3"
          >
            <Skeleton className="size-4 rounded-full bg-sidebar-accent-foreground/20" />
            <Skeleton
              className={cn(
                "h-3 rounded-full bg-sidebar-accent-foreground/25",
                sidebarLabelWidth(navIndex)
              )}
            />
          </div>
        ))}
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-3">
          <Skeleton className="size-8 rounded-full bg-brand-green/15" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 bg-sidebar-accent-foreground/25" />
            <Skeleton className="h-2.5 w-16 bg-sidebar-accent-foreground/15" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function BoneyardWorkspaceSkeleton({
  mode,
}: Readonly<{
  mode: "admin" | "platform";
}>) {
  const metricIds = createBoneyardIds("metric", 3);

  return (
    <BoneyardCanvas className="flex h-svh overflow-hidden">
      <BoneyardSidebar mode={mode} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
          <BoneyardPanel className="p-6 lg:p-8">
            <BoneyardPageIntro
              label={`${mode} boneyard`}
              action={
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-28 rounded-full" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
              }
            />
          </BoneyardPanel>

          <div className="grid gap-4 lg:grid-cols-3">
            {metricIds.map((metricId) => (
              <BoneyardPanel key={metricId} className="p-5">
                <div className="space-y-4">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-4 w-40 rounded-full" />
                </div>
              </BoneyardPanel>
            ))}
          </div>

          <BoneyardTableGrid columns={4} rows={5} />
        </div>
      </main>
    </BoneyardCanvas>
  );
}

export function BoneyardAuthSkeleton() {
  const fieldIds = createBoneyardIds("field", 2);

  return (
    <BoneyardCanvas className="flex min-h-svh items-center justify-center px-4 py-12">
      <BoneyardPanel className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-green/15 text-brand-green">
              <PhoneIcon className="size-6" />
            </div>
            <BoneyardStamp label="Access boneyard" />
            <Skeleton className="h-9 w-48 rounded-full" />
            <Skeleton className="h-4 w-56 rounded-full" />
          </div>

          <div className="space-y-4">
            {fieldIds.map((fieldId) => (
              <div key={fieldId} className="space-y-2">
                <Skeleton className="h-3.5 w-20 rounded-full" />
                <Skeleton className="h-11 w-full rounded-2xl" />
              </div>
            ))}
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </div>
      </BoneyardPanel>
    </BoneyardCanvas>
  );
}

export function BoneyardTablePageSkeleton({
  label = "Table boneyard",
  showSearch = false,
  showAction = false,
  columns = 5,
  rows = 6,
}: Readonly<{
  label?: string;
  showSearch?: boolean;
  showAction?: boolean;
  columns?: number;
  rows?: number;
}>) {
  return (
    <div className="space-y-6">
      <BoneyardPageIntro
        label={label}
        action={showAction ? <Skeleton className="h-10 w-32 rounded-full" /> : undefined}
      />

      {showSearch ? <Skeleton className="h-11 w-full max-w-sm rounded-2xl" /> : null}

      <BoneyardTableGrid columns={columns} rows={rows} />
    </div>
  );
}

export function BoneyardFormPageSkeleton({
  label = "Settings boneyard",
  sections = 2,
}: Readonly<{
  label?: string;
  sections?: number;
}>) {
  const sectionIds = createBoneyardIds("section", sections);
  const fieldIds = createBoneyardIds("field", 4);

  return (
    <div className="space-y-6">
      <BoneyardPageIntro label={label} />

      {sectionIds.map((sectionId, sectionIndex) => (
        <BoneyardPanel key={sectionId} className="p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-full" />
              <Skeleton className="h-4 w-64 rounded-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {fieldIds.map((fieldId, fieldIndex) => (
                <div
                  key={`${sectionId}-${fieldId}`}
                  className={cn(
                    "space-y-2",
                    fieldIndex === 3 && sectionIndex === 0 ? "md:col-span-2" : ""
                  )}
                >
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                  <Skeleton
                    className={cn(
                      "w-full rounded-2xl",
                      fieldIndex === 3 && sectionIndex === 0 ? "h-24" : "h-11"
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </BoneyardPanel>
      ))}

      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function BoneyardCardGridSkeleton({
  label = "Card boneyard",
  cards = 3,
}: Readonly<{
  label?: string;
  cards?: number;
}>) {
  const cardIds = createBoneyardIds("card", cards);

  return (
    <div className="space-y-6">
      <BoneyardPageIntro
        label={label}
        action={<Skeleton className="h-10 w-32 rounded-full" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cardIds.map((cardId) => (
          <BoneyardPanel key={cardId} className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
          </BoneyardPanel>
        ))}
      </div>
    </div>
  );
}

export function BoneyardDetailPageSkeleton({
  label = "Detail boneyard",
}: Readonly<{
  label?: string;
}>) {
  const statIds = createBoneyardIds("stat", 4);
  const lineIds = createBoneyardIds("line", 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 rounded-full" />
        <div className="space-y-2">
          <BoneyardStamp label={label} />
          <Skeleton className="h-9 w-64 rounded-full" />
          <Skeleton className="h-4 w-72 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statIds.map((statId) => (
          <BoneyardPanel key={statId} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </BoneyardPanel>
        ))}
      </div>

      <BoneyardPanel className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
        </div>
      </BoneyardPanel>

      <BoneyardPanel className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-48 rounded-full" />
          {lineIds.map((lineId) => (
            <div key={lineId} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3 rounded-full" />
                <Skeleton className="h-16 w-full rounded-3xl" />
              </div>
            </div>
          ))}
        </div>
      </BoneyardPanel>
    </div>
  );
}
