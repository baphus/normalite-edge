import crypto from 'crypto';

interface SseTicket {
    userId: string;
    expiresAt: number;
}

/**
 * In-memory store for short-lived, single-use SSE connection tickets.
 * Tickets expire after 30 seconds and are consumed on first use.
 */
class SseTicketService {
    private tickets = new Map<string, SseTicket>();

    /**
     * Generate a single-use ticket for SSE connection.
     * Ticket expires in 30 seconds.
     */
    createTicket(userId: string): string {
        const ticket = crypto.randomBytes(32).toString('hex');
        this.tickets.set(ticket, {
            userId,
            expiresAt: Date.now() + 30_000, // 30 seconds
        });

        // Cleanup expired tickets periodically
        this.cleanupExpired();

        return ticket;
    }

    /**
     * Consume a ticket. Returns the userId if valid, null otherwise.
     * Tickets are single-use — once consumed, they cannot be reused.
     */
    consumeTicket(ticket: string): string | null {
        const entry = this.tickets.get(ticket);
        if (!entry) return null;

        // Always delete (single-use)
        this.tickets.delete(ticket);

        // Check expiry
        if (Date.now() > entry.expiresAt) return null;

        return entry.userId;
    }

    private cleanupExpired(): void {
        const now = Date.now();
        // Only clean up if map is getting large
        if (this.tickets.size > 100) {
            for (const [key, val] of this.tickets) {
                if (now > val.expiresAt) {
                    this.tickets.delete(key);
                }
            }
        }
    }
}

export const sseTicketService = new SseTicketService();
