import { prisma } from '../src/config/db';
import { cleanupOldReadings } from '../src/utils/cleanup';

async function test() {
  try {
    console.log('--- CLEANUP VERIFICATION ---');
    
    // 1. Get a test bus
    const bus = await prisma.bus.findFirst();
    if (!bus) {
      console.error('No bus found to test with. Please register a bus first.');
      return;
    }
    
    console.log(`Using bus: ${bus.busName} (${bus.busId})`);

    // 2. Insert an OLD reading (48 hours ago)
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    console.log(`Inserting old reading dated: ${oldDate.toISOString()}`);
    
    await prisma.$queryRaw`
      INSERT INTO "Reading" ("id", "busId", "longitude", "latitude", "location", "recordedAt", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${bus.id},
        90.40,
        23.76,
        ST_SetSRID(ST_MakePoint(90.40, 23.76), 4326),
        ${oldDate},
        NOW()
      );
    `;

    // 3. Insert a NEW reading (Just now)
    console.log('Inserting fresh reading...');
    await prisma.$queryRaw`
      INSERT INTO "Reading" ("id", "busId", "longitude", "latitude", "location", "recordedAt", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${bus.id},
        90.41,
        23.77,
        ST_SetSRID(ST_MakePoint(90.41, 23.77), 4326),
        ${new Date()},
        NOW()
      );
    `;

    // 4. Run cleanup
    console.log('Running cleanup...');
    await cleanupOldReadings();

    // 5. Verify
    const remainingOld = await prisma.reading.findMany({
      where: {
        recordedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (remainingOld.length === 0) {
      console.log('✅ SUCCESS: Old reading deleted, fresh reading retained.');
    } else {
      console.error('❌ FAILURE: Old readings still exist in the database.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
