import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Toaster } from "../shared/Toaster";
import { FirebaseWarningBanner } from "../shared/FirebaseWarningBanner";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <MobileNav />
        <FirebaseWarningBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
