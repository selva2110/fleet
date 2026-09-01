"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

const Collapsible = CollapsiblePrimitive.Root;

function CollapsibleTrigger({
  className,
  children,
  showIcon = false,
  ...props
}: CollapsiblePrimitive.Trigger.Props & {
  showIcon?: boolean;
}) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    >
      {children}

      {showIcon && (
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            "data-panel-open:rotate-180",
          )}
        />
      )}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden",
        "data-open:animate-in data-open:fade-in-0",
        "data-closed:animate-out data-closed:fade-out-0",
        "data-open:animate-collapsible-down",
        "data-closed:animate-collapsible-up",
        className,
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Panel>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
