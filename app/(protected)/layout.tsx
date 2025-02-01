import { NotificationCenter } from "@/components/notifications/notification-center";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div>{/* Logo */}</div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
