"use client";

import * as React from "react";

import { Input } from "./input";
import { Field } from "../crud/form-fields";

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

function OtpInput({
  length = 6,
  value,
  onChange,
  label,
  error,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const chars = value.replace(/\D/g, "").slice(0, length).split("");
    while (chars.length < length) chars.push("");
    return chars;
  }, [value, length]);

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setDigit(index - 1, "");
    } else if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  const content = (
    <div className="flex gap-2">
      {digits.map((digit, index) => (
        <Input
          key={index}
          ref={(el: HTMLInputElement | null) => {
            inputsRef.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-invalid={error ? true : undefined}
          className="h-11 w-11 px-0 text-center text-lg font-semibold"
        />
      ))}
    </div>
  );

  if (label) {
    return (
      <Field label={label} error={error}>
        {content}
      </Field>
    );
  }

  return (
    <div>
      {content}
      {error ? (
        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

export { OtpInput };
