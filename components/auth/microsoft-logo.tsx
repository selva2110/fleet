// The four-square Microsoft logo, per Microsoft's identity guidelines for
// "Sign in with Microsoft" buttons (fixed brand colors, not theme-tokenized).
export function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 21 21"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
