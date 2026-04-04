"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A simple toggle switch component.
 * Uses a native-style approach matching the design system's checkbox pattern.
 */
function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  name,
  ...props
}: {
  className?: string
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  name?: string
} & Omit<React.HTMLAttributes<HTMLButtonElement>, "onChange">) {
  const [internalChecked, setInternalChecked] = React.useState(
    defaultChecked ?? false
  )
  const isChecked = checked !== undefined ? checked : internalChecked

  const handleClick = () => {
    if (disabled) return
    const next = !isChecked
    setInternalChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      data-slot="switch"
      id={id}
      name={name}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          isChecked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

export { Switch }
