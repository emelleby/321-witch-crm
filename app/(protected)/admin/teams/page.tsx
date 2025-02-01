"use client";

import { TeamManagement } from "@/components/admin/team-management";

export default function AdminTeamsPage() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold">Team Management</h1>
      <TeamManagement />
    </div>
  );
}
