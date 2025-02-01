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
      const { error } = await supabase
        .from("support_tickets")
        .update({
          customer_rating: rating,
          customer_feedback: feedback.trim() || null,
        })
        .eq("ticket_id", ticketId);

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
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 font-semibold">Rate your experience</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                variant={rating === value ? "default" : "outline"}
                onClick={() => setRating(value)}
                data-testid={`rating-${value}`}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Additional feedback</h3>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="min-h-[100px]"
            data-testid="feedback-textarea"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          className="w-full"
          data-testid="submit-feedback"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </Card>
  );
}
