"use client";

import { TeamManagement } from "@/components/admin/team-management";
import { PageHeader } from "@/components/page-header";

export default function AdminAgentsPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        heading="Agent Management"
        text="Manage your support team members and their roles."
      />
      <TeamManagement />
    </div>
  );
}
