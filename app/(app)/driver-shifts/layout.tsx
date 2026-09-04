import { DriverShiftsProvider } from "@/lib/driver-shifts/store";

export default function DriverShiftsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DriverShiftsProvider>{children}</DriverShiftsProvider>;
}
