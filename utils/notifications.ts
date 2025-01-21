import { toast } from "sonner"

export const notifications = {
    ticketCreated: () => {
        toast.success("Ticket created successfully", {
            description: "We'll notify you when an agent responds."
        })
    },
    ticketUpdated: () => {
        toast.success("Ticket updated successfully")
    },
    newMessage: (ticketId: string, message: string) => {
        toast("New message received", {
            description: message,
            action: {
                label: "View",
                onClick: () => window.location.href = `/customer/tickets/${ticketId}`
            }
        })
    },
    error: (message: string) => {
        toast.error("Error", {
            description: message
        })
    },
    success: (message: string) => {
        toast.success("Success", {
            description: message
        })
    }
} 