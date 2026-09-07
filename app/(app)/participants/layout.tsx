import { ParticipantStoreProvider } from "@/lib/participant-crud/store";

export default function ParticipantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ParticipantStoreProvider>{children}</ParticipantStoreProvider>;
}
