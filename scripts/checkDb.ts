import { prisma } from '../src/config/db';

async function diagnose() {
  try {
    console.log('Checking database connection...');
    await prisma.$connect();
    console.log('Connected.');

    console.log('\nChecking PostGIS extension...');
    try {
      const postgisVersion = await prisma.$queryRaw`SELECT PostGIS_Version();`;
      console.log('PostGIS is enabled:', postgisVersion);
    } catch (e) {
      console.error('PostGIS is NOT enabled or accessible:', (e as Error).message);
    }

    console.log('\nChecking "Reading" table...');
    try {
      const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
      console.log('Tables in public schema:', tables);
    } catch (e) {
      console.error('Error checking tables:', (e as Error).message);
    }

    console.log('\nChecking "bus" record for wbx_bus_4d8668dde36d...');
    const bus = await prisma.bus.findUnique({ where: { busId: 'wbx_bus_4d8668dde36d' } });
    console.log('Bus found:', bus ? 'Yes' : 'No');
    if (bus) {
        console.log('Bus internal ID:', bus.id);
        
        console.log('\nTesting raw insertion...');
        try {
          const longitude = 90.4066;
          const latitude = 23.7639;
          const recordTime = new Date();
          
          await prisma.$queryRaw`
            INSERT INTO "Reading" ("id", "busId", "longitude", "latitude", "location", "recordedAt", "createdAt")
            VALUES (
              gen_random_uuid()::text,
              ${bus.id},
              ${longitude},
              ${latitude},
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
              ${recordTime},
              NOW()
            );
          `;
          console.log('Test insertion successful!');
        } catch (e) {
          console.error('Test insertion FAILED:', e);
        }
    }

  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
