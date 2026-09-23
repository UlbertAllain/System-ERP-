"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  leadingIcon?: React.ReactNode;
};

function PasswordInput({
  className,
  leadingIcon,
  disabled,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className="relative">
      {leadingIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted-foreground">
          {leadingIcon}
        </span>
      ) : null}

      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-11", leadingIcon && "pl-10", className)}
        disabled={disabled}
        {...props}
      />

      <button
        type="button"
        aria-label={
          isVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
        }
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        disabled={disabled}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
      >
        {isVisible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
