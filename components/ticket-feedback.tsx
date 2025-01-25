"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

interface TicketFeedbackProps {
  ticketId: string;
  onFeedbackSubmit?: () => void;
}

export function TicketFeedback({
  ticketId,
  onFeedbackSubmit,
}: TicketFeedbackProps) {
  const supabase = createBrowserSupabaseClient();
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!rating) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ticket_feedback").insert({
        ticket_id: ticketId,
        rating,
        feedback: feedback.trim() || null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Success",
        description: "Thank you for your feedback!",
        variant: "default",
      });
      onFeedbackSubmit?.();
    } catch (error) {
      console.error("Feedback error:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Thank you for your feedback!
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold">How was your experience?</h3>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <Button
            key={value}
            variant={rating === value ? "default" : "outline"}
            className="w-12 h-12"
            onClick={() => setRating(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <Textarea
        placeholder="Additional feedback (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="min-h-[100px]"
      />
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!rating || submitting}>
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </Card>
  );
}
