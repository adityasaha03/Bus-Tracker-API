import { prisma } from '../config/db';
import { hashPassword } from '../utils/hash';
import { generateUserId } from '../utils/generateUserId';
import { redis } from '../config/redis';

async function seed() {
  console.log('🌱 Seeding database...');

  // // Clean existing data
  // console.log('Cleaning existing data...');
  // await prisma.coordinatorBus.deleteMany();
  // await prisma.reading.deleteMany();
  // await prisma.bus.deleteMany();
  // await prisma.user.deleteMany();

  // Create users
  console.log('Creating users...');

  const superAdmin = await prisma.user.create({
    data: {
      userId: generateUserId(),
      name: 'Super Admin',
      austId: '21-00001-1',
      email: 'superadmin@test.com',
      passwordHash: await hashPassword('password123'),
      phone: '01711111111',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`Created super admin: ${superAdmin.email}`);

  const coordinator1 = await prisma.user.create({
    data: {
      userId: generateUserId(),
      name: 'Coordinator One',
      austId: '21-00002-1',
      email: 'coordinator1@test.com',
      passwordHash: await hashPassword('password123'),
      phone: '01722222222',
      role: 'COORDINATOR',
      status: 'ACTIVE',
    },
  });
  console.log(`Created coordinator: ${coordinator1.email}`);

  const coordinator2 = await prisma.user.create({
    data: {
      userId: generateUserId(),
      name: 'Coordinator Two',
      austId: '21-00003-1',
      email: 'coordinator2@test.com',
      passwordHash: await hashPassword('password123'),
      phone: '01733333333',
      role: 'COORDINATOR',
      status: 'ACTIVE',
    },
  });
  console.log(`Created coordinator: ${coordinator2.email}`);

  const generalUser = await prisma.user.create({
    data: {
      userId: generateUserId(),
      name: 'General User',
      austId: '21-00004-1',
      email: 'general@test.com',
      passwordHash: await hashPassword('password123'),
      phone: '01744444444',
      role: 'GENERAL',
      status: 'ACTIVE',
    },
  });
  console.log(`Created general user: ${generalUser.email}`);

  const blockedUser = await prisma.user.create({
    data: {
      userId: generateUserId(),
      name: 'Blocked User',
      austId: '21-00005-1',
      email: 'blocked@test.com',
      passwordHash: await hashPassword('password123'),
      phone: '01755555555',
      role: 'GENERAL',
      status: 'BLOCKED',
    },
  });
  console.log(`Created blocked user: ${blockedUser.email}`);

  // Create buses
  console.log('Creating buses...');

  const { BUS_ID_PREFIX, API_KEY_PREFIX } = await import('../config/env');
  const { randomBytes } = await import('crypto');

  const generateBusId = () => `${BUS_ID_PREFIX}_${randomBytes(6).toString('hex')}`;
  const generateApiKey = () => `${API_KEY_PREFIX}_${randomBytes(16).toString('hex')}`;

  const bus1ApiKey = generateApiKey();
  const bus1 = await prisma.bus.create({
    data: {
      busId: generateBusId(),
      busName: 'Bus 01',
      licensePlate: 'DHAKA-1234',
      routeLabel: 'Route 1 - Campus to Motijheel',
      apiKeyHash: await hashPassword(bus1ApiKey),
      status: 'ACTIVE',
      lastSeenAt: null,
    },
  });
  console.log(`Created bus: ${bus1.busName} | busId: ${bus1.busId} | apiKey: ${bus1ApiKey}`);

  const bus2ApiKey = generateApiKey();
  const bus2 = await prisma.bus.create({
    data: {
      busId: generateBusId(),
      busName: 'Bus 02',
      licensePlate: 'DHAKA-5678',
      routeLabel: 'Route 2 - Campus to Gulshan',
      apiKeyHash: await hashPassword(bus2ApiKey),
      status: 'ACTIVE',
      lastSeenAt: null,
    },
  });
  console.log(`Created bus: ${bus2.busName} | busId: ${bus2.busId} | apiKey: ${bus2ApiKey}`);

  const bus3ApiKey = generateApiKey();
  const bus3 = await prisma.bus.create({
    data: {
      busId: generateBusId(),
      busName: 'Bus 03',
      licensePlate: 'DHAKA-9999',
      routeLabel: 'Route 3 - Campus to Mirpur',
      apiKeyHash: await hashPassword(bus3ApiKey),
      status: 'BLOCKED',
      lastSeenAt: null,
    },
  });
  console.log(`Created blocked bus: ${bus3.busName} | busId: ${bus3.busId} | apiKey: ${bus3ApiKey}`);

  // Assign coordinators to buses
  console.log('Assigning coordinators to buses...');

  await prisma.coordinatorBus.create({
    data: {
      userId: coordinator1.id,
      busId: bus1.id,
    },
  });
  console.log(`Assigned ${coordinator1.name} to ${bus1.busName}`);

  await prisma.coordinatorBus.create({
    data: {
      userId: coordinator1.id,
      busId: bus2.id,
    },
  });
  console.log(`Assigned ${coordinator1.name} to ${bus2.busName}`);

  await prisma.coordinatorBus.create({
    data: {
      userId: coordinator2.id,
      busId: bus2.id,
    },
  });
  console.log(`Assigned ${coordinator2.name} to ${bus2.busName}`);

  // Create dummy GPS readings and write to Redis
  console.log('Creating GPS readings...');

  const readings = [
    { longitude: 90.4066, latitude: 23.7639, bus: bus1 },
    { longitude: 90.4120, latitude: 23.7700, bus: bus1 },
    { longitude: 90.4200, latitude: 23.7800, bus: bus1 },
    { longitude: 90.3800, latitude: 23.7500, bus: bus2 },
    { longitude: 90.3900, latitude: 23.7600, bus: bus2 },
  ];

  for (const r of readings) {
    const recordedAt = new Date();

    await prisma.$executeRaw`
      INSERT INTO "Reading" (id, "busId", longitude, latitude, location, "recordedAt", "createdAt")
      VALUES (
        ${crypto.randomUUID()},
        ${r.bus.id},
        ${r.longitude},
        ${r.latitude},
        ST_SetSRID(ST_MakePoint(${r.longitude}, ${r.latitude}), 4326),
        ${recordedAt},
        NOW()
      )
    `;

    console.log(`Created reading for ${r.bus.busName}: [${r.longitude}, ${r.latitude}]`);
  }

  // Write latest positions to Redis
  console.log('Writing latest positions to Redis...');

  const bus1LatestReading = { longitude: 90.4200, latitude: 23.7800 };
  await redis.set(
    `bus:latest:${bus1.busId}`,
    JSON.stringify({
      busId: bus1.busId,
      latitude: bus1LatestReading.latitude,
      longitude: bus1LatestReading.longitude,
      recordedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    })
  );
  console.log(`Written Redis key for ${bus1.busName}`);

  const bus2LatestReading = { longitude: 90.3900, latitude: 23.7600 };
  await redis.set(
    `bus:latest:${bus2.busId}`,
    JSON.stringify({
      busId: bus2.busId,
      latitude: bus2LatestReading.latitude,
      longitude: bus2LatestReading.longitude,
      recordedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    })
  );
  console.log(`Written Redis key for ${bus2.busName}`);

  // Print summary
  console.log('\n========== SEED COMPLETE ==========');
  console.log('\nUsers (all passwords are "password123"):');
  console.log(`  Super Admin  → email: superadmin@test.com`);
  console.log(`  Coordinator1 → email: coordinator1@test.com | assigned to Bus 01 + Bus 02`);
  console.log(`  Coordinator2 → email: coordinator2@test.com | assigned to Bus 02`);
  console.log(`  General User → email: general@test.com`);
  console.log(`  Blocked User → email: blocked@test.com (blocked)`);
  console.log('\nBuses:');
  console.log(`  Bus 01 (active)  → busId: ${bus1.busId} | apiKey: ${bus1ApiKey}`);
  console.log(`  Bus 02 (active)  → busId: ${bus2.busId} | apiKey: ${bus2ApiKey}`);
  console.log(`  Bus 03 (blocked) → busId: ${bus3.busId} | apiKey: ${bus3ApiKey}`);
  console.log('\nSave the busId and apiKey values above for testing device auth routes');
  console.log('====================================\n');

  await prisma.$disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  prisma.$disconnect();
  process.exit(1);
});