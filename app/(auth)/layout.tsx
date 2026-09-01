import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { AuthBrandingCopy, AuthCopyright } from "@/components/auth/auth-branding";
import { ToastViewport } from "@/components/notifications/toast-viewport";

export const metadata: Metadata = {
  title: "CareVoy | Sign in",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 15% 10%, var(--sidebar-ring) 0%, transparent 45%), radial-gradient(circle at 85% 90%, var(--sidebar-ring) 0%, transparent 40%)",
          }}
        />
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/tranzio-brand.png"
            alt="CareVoy"
            width={150}
            height={36}
            loading="eager"
            className="w-auto object-contain"
            style={{ height: 72 }}
          />
        </Link>

        <AuthBrandingCopy />
        <AuthCopyright />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Image
              src="/tranzio-brand.png"
              alt="CareVoy"
              width={120}
              height={28}
              loading="eager"
              className="w-auto object-contain"
              style={{ height: 100 }}
            />
          </Link>
          <AuthHeaderControls />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          {children}
        </div>
      </div>

      <ToastViewport />
    </div>
  );
}
