/**
 * Offline Queue Manager
 *
 * Manages a persistent queue of mutations in localStorage
 * for offline-first functionality.
 */

const QUEUE_STORAGE_KEY = "rfp-analyzer-offline-queue";
const MAX_AGE_DAYS = 7;

export interface QueuedMutation {
  id: string; // UUID unique
  timestamp: number; // Date.now()
  endpoint: string; // '/api/responses/{id}'
  method: "PUT" | "POST" | "DELETE";
  body: Record<string, any>;
  responseId: string; // For UI display
  retryCount: number; // Number of retry attempts
}

/**
 * Generate a simple UUID v4
 */
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get all mutations from localStorage
 */
function getQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!stored) return [];

    const queue: QueuedMutation[] = JSON.parse(stored);

    // Clean up old mutations (> 7 days)
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const filtered = queue.filter((mutation) => {
      return now - mutation.timestamp < maxAge;
    });

    // Save cleaned queue if items were removed
    if (filtered.length !== queue.length) {
      saveQueue(filtered);
    }

    return filtered;
  } catch (error) {
    console.error("[offlineQueue] Error reading queue:", error);
    return [];
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: QueuedMutation[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("[offlineQueue] Error saving queue:", error);
  }
}

/**
 * Offline Queue API
 */
export const offlineQueue = {
  /**
   * Add a new mutation to the queue
   */
  add(
    mutation: Omit<QueuedMutation, "id" | "timestamp" | "retryCount">
  ): void {
    const queue = getQueue();

    const newMutation: QueuedMutation = {
      ...mutation,
      id: generateId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(newMutation);
    saveQueue(queue);

    console.log("[offlineQueue] Added mutation:", newMutation.id, mutation);
  },

  /**
   * Remove a mutation from the queue
   */
  remove(mutationId: string): void {
    const queue = getQueue();
    const filtered = queue.filter((m) => m.id !== mutationId);

    if (filtered.length !== queue.length) {
      saveQueue(filtered);
      console.log("[offlineQueue] Removed mutation:", mutationId);
    }
  },

  /**
   * Update retry count for a mutation
   */
  incrementRetry(mutationId: string): void {
    const queue = getQueue();
    const mutation = queue.find((m) => m.id === mutationId);

    if (mutation) {
      mutation.retryCount++;
      saveQueue(queue);
      console.log(
        "[offlineQueue] Incremented retry count:",
        mutationId,
        mutation.retryCount
      );
    }
  },

  /**
   * Get all mutations in the queue
   */
  getAll(): QueuedMutation[] {
    return getQueue();
  },

  /**
   * Get count of pending mutations
   */
  getPendingCount(): number {
    return getQueue().length;
  },

  /**
   * Clear all mutations (use with caution)
   */
  clear(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem(QUEUE_STORAGE_KEY);
    console.log("[offlineQueue] Cleared all mutations");
  },

  /**
   * Check if a specific response has pending mutations
   */
  hasPendingMutations(responseId: string): boolean {
    const queue = getQueue();
    return queue.some((m) => m.responseId === responseId);
  },
};
