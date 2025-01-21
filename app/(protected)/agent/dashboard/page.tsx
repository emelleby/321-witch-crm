'use client';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

export default function AgentDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Agent Dashboard"
        description="Overview of your tickets and performance"
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <h3 className="font-semibold">Active Tickets</h3>
          {/* Add ticket stats here */}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Response Time</h3>
          {/* Add response time stats here */}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Resolution Rate</h3>
          {/* Add resolution stats here */}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Customer Satisfaction</h3>
          {/* Add satisfaction stats here */}
        </Card>
      </div>
    </div>
  );
}
