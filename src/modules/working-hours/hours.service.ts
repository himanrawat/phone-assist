import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { tenantWorkingHours } from '../../shared/db/schema.js';

export async function getWorkingHours(tenantId: string) {
  return db.select().from(tenantWorkingHours).where(eq(tenantWorkingHours.tenantId, tenantId));
}

export async function replaceWorkingHours(tenantId: string, hours: Array<{
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}>) {
  await db.delete(tenantWorkingHours).where(eq(tenantWorkingHours.tenantId, tenantId));

  if (hours.length > 0) {
    await db.insert(tenantWorkingHours).values(
      hours.map((hour) => ({
        tenantId,
        ...hour,
      }))
    );
  }

  return getWorkingHours(tenantId);
}
