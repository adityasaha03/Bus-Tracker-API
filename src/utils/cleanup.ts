import { prisma } from '../config/db';

/**
 * Deletes readings older than 24 hours.
 */
export async function cleanupOldReadings() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    const deleted = await prisma.reading.deleteMany({
      where: {
        recordedAt: {
          lt: yesterday,
        },
      },
    });
    
    if (deleted.count > 0) {
      console.log(`[CLEANUP] Deleted ${deleted.count} old reading(s).`);
    }
  } catch (error) {
    console.error('[CLEANUP] Error during reading cleanup:', error);
  }
}

/**
 * Starts a periodic cleanup job.
 * @param intervalMs How often to run the cleanup (default 1 hour).
 */
export function startCleanupJob(intervalMs: number = 60 * 60 * 1000) {
  console.log(`[CLEANUP] Background job started. Running every ${intervalMs / 60000} minutes.`);
  
  // Run once on startup
  cleanupOldReadings();
  
  // Schedule periodic runs
  const timer = setInterval(cleanupOldReadings, intervalMs);
  
  return () => clearInterval(timer);
}
