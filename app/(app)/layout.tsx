import { AppShell } from "@/components/app-shell";
import { FleetSessionProvider } from "@/components/context/fleet-session-provider";
import { TripSocketProvider } from "@/components/context/tripsocket-provider";
import { SessionManager } from "@/components/context/session-provider";

export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionManager>
      <FleetSessionProvider>
        <TripSocketProvider>
          <AppShell>{children}</AppShell>
        </TripSocketProvider>
      </FleetSessionProvider>
    </SessionManager>
  );
}
