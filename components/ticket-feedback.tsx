'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/utils/supabase/client"
import { notifications } from "@/utils/notifications"
import { Card } from "@/components/ui/card"

interface TicketFeedbackProps {
    ticketId: string
    onFeedbackSubmit?: () => void
}

export function TicketFeedback({ ticketId, onFeedbackSubmit }: TicketFeedbackProps) {
    const supabase = createClient()
    const [rating, setRating] = useState<number | null>(null)
    const [feedback, setFeedback] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async () => {
        if (!rating) return

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('ticket_feedback')
                .insert({
                    ticket_id: ticketId,
                    rating,
                    feedback: feedback.trim() || null
                })

            if (error) throw error

            setSubmitted(true)
            notifications.success('Thank you for your feedback!')
            onFeedbackSubmit?.()
        } catch (error) {
            console.error('Feedback error:', error)
            notifications.error('Failed to submit feedback')
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <Card className="p-6 text-center text-muted-foreground">
                Thank you for your feedback!
            </Card>
        )
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
                <Button
                    onClick={handleSubmit}
                    disabled={!rating || submitting}
                >
                    {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
            </div>
        </Card>
    )
} 