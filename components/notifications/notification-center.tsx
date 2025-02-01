"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database } from "@/database.types";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      // Join with notifications table to get full notification data
      const { data: notificationData, error: notificationError } = await supabase
        .from("notifications")
        .select("*")
        .in(
          "notification_id",
          (data || []).map((d) => d.notification_id)
        );

      if (notificationError) {
        console.error("Error fetching notification details:", notificationError);
        return;
      }

      setNotifications(notificationData || []);
      setUnreadCount(notificationData?.length || 0);
    };

    fetchNotifications();

    // Set up realtime subscription
    const channel = supabase
      .channel("notification_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_assignments",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Insert into read_status table
      const { error } = await supabase.from("read_status").insert({
        user_id: user.id,
        entity_type: "notification",
        entity_id: notificationId,
      });

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ticket_assigned_to_team":
      case "ticket_assigned_to_agent":
        return "🎫";
      case "chat_message":
        return "💬";
      case "admin_alert":
        return "⚠️";
      default:
        return "📢";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          data-testid="notification-trigger"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              data-testid="unread-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <ScrollArea className="h-80">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Notifications</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm">
                  Mark all as read
                </Button>
              )}
            </div>
            <div className="divide-y divide-border rounded-md border">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No new notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    className="flex items-start gap-4 p-4"
                    onClick={() =>
                      handleMarkAsRead(notification.notification_id)
                    }
                    data-testid={`notification-${notification.notification_id}`}
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
