"use client";

import { SLAPolicies } from "@/components/admin/sla-policies";
import { PageHeader } from "@/components/page-header";

export default function SLAManagementPage() {
  return (
    <div className="container space-y-6">
      <PageHeader
        title="SLA Management"
        description="Configure and manage Service Level Agreement policies for your organization"
      />
      <SLAPolicies />
    </div>
  );
}
