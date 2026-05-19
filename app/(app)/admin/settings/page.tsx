import { Settings } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/data/empty-state";

export default function AdminSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>System-wide settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={Settings}
          title="Phase 12"
          description="Brand, hours of operation, and other single-row config will live here."
        />
      </CardContent>
    </Card>
  );
}
