"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Field } from "../crud/form-fields";

type PasswordInputProps = {
  className?: string;
  value: string;
  label?: string;
  error?: string;
  required?: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
};

function PasswordInput({
  className,
  onChange,
  value,
  label = "Password",
  error,
  placeholder,
  required = false,
}: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Field label={label} required={required} error={error}>
      <div className="relative">
        <Input
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          type={visible ? "text" : "password"}
          className={cn("pr-8", className)}
          value={value}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

export { PasswordInput };
