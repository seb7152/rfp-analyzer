"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "./label";

const fieldVariants = cva(
  "group/field flex w-full gap-3 text-foreground data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start",
        responsive:
          "flex-col [&>*]:w-full [&>.sr-only]:w-auto md:flex-row md:items-center md:[&>[data-slot=field-label]]:flex-auto md:has-[>[data-slot=field-content]]:items-start",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
);

type FieldProps = React.ComponentProps<"div"> &
  VariantProps<typeof fieldVariants>;

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, orientation, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
);
Field.displayName = "Field";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("flex flex-col gap-6", className)}
      {...props}
    />
  );
}

function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend
      data-slot="field-legend"
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:gap-10",
        className
      )}
      {...props}
    />
  );
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    data-slot="field-label"
    className={cn(
      "flex items-center gap-2 text-sm font-medium leading-snug text-foreground/80",
      className
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "flex flex-1 flex-col gap-2 text-sm leading-snug",
        className
      )}
      {...props}
    />
  );
}

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<"p">
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="field-description"
    className={cn(
      "text-sm font-normal leading-normal text-muted-foreground",
      className
    )}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
};
