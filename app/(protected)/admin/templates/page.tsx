"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TemplatesPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Ticket Templates</CardTitle>
          <CardDescription>
            This feature is coming soon. Templates will allow you to create
            pre-defined responses and ticket structures.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p>Templates functionality is not yet implemented.</p>
          <p>Check back later for updates.</p>
        </div>
      </CardContent>
    </Card>
  );
}
