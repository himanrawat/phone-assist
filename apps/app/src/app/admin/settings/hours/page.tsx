"use client";

import { BoneyardFormPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workingHours as hoursApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { SaveIcon } from "lucide-react";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

function defaultHours(): WorkingHour[] {
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    startTime: "09:00",
    endTime: "18:00",
    isActive: i >= 1 && i <= 5,
  }));
}

export default function WorkingHoursPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["working-hours"],
    queryFn: () => hoursApi.get(),
  });

  const [hours, setHours] = useState<WorkingHour[]>(defaultHours());

  useEffect(() => {
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      const mapped = defaultHours().map((dh) => {
        const existing = (data.data as WorkingHour[]).find(
          (h) => h.dayOfWeek === dh.dayOfWeek
        );
        return existing ?? dh;
      });
      setHours(mapped);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => hoursApi.update(hours),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["working-hours"] }),
  });

  function updateHour(index: number, updates: Partial<WorkingHour>) {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...updates } : h))
    );
  }

  if (isLoading) {
    return <BoneyardFormPageSkeleton label="Hours boneyard" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Working Hours</h1>
        <p className="text-sm text-muted-foreground">
          Set when your AI assistant is available to take calls
        </p>
      </div>

      <div className="max-w-2xl space-y-3">
        {hours.map((hour, i) => (
          <div
            key={hour.dayOfWeek}
            className={`flex items-center gap-4 rounded-lg border p-4 ${
              !hour.isActive ? "opacity-50" : ""
            }`}
          >
            <label className="flex w-28 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={hour.isActive}
                onChange={(e) => updateHour(i, { isActive: e.target.checked })}
                className="rounded"
              />
              {DAYS[hour.dayOfWeek]}
            </label>
            <input
              type="time"
              value={hour.startTime}
              onChange={(e) => updateHour(i, { startTime: e.target.value })}
              disabled={!hour.isActive}
              className="input-field w-32"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="time"
              value={hour.endTime}
              onChange={(e) => updateHour(i, { endTime: e.target.value })}
              disabled={!hour.isActive}
              className="input-field w-32"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <SaveIcon className="size-4" />
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </button>
        {mutation.isSuccess && <span className="text-sm text-green-600">Saved</span>}
        {mutation.isError && <span className="text-sm text-destructive">Save failed</span>}
      </div>
    </div>
  );
}
