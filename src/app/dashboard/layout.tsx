import { AuthorityGate } from "@/components/shared/AuthorityGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthorityGate>{children}</AuthorityGate>;
}
