import { prisma } from '../src/config/db';
import { hashPassword } from '../src/utils/hash';
import { generateBusId } from '../src/utils/generateBusId';
import { generateApiKey } from '../src/utils/generateApiKey';
import { readFile, writeFile } from 'fs/promises';

const NUM_BUSES = 18;
const TARGET_FILE = "./scripts/simulateBuses.ts";

async function setup() {
  const credentials = [];

  console.log(`🚀 Registering ${NUM_BUSES} buses directly in DB...`);

  for (let i = 1; i <= NUM_BUSES; i++) {
    try {
      const busId = generateBusId();
      const rawApiKey = generateApiKey();
      const apiKeyHash = await hashPassword(rawApiKey);

      await prisma.bus.create({
        data: {
          busId,
          busName: `Simulated Bus ${i.toString().padStart(2, '0')}`,
          licensePlate: `DHK-SIM-${Math.floor(Math.random() * 9000) + 1000}`,
          routeLabel: `Simulation Route ${Math.ceil(i/3)}`,
          apiKeyHash,
        },
      });

      credentials.push({ busId, apiKey: rawApiKey });
      console.log(`✅ Registered ${busId}`);
    } catch (err: any) {
      console.error(`❌ Error registering bus ${i}:`, err.message);
    }
  }

  if (credentials.length === 0) {
    console.error("No buses registered. Aborting update.");
    return;
  }

  console.log(`📝 Updating ${TARGET_FILE}...`);
  
  let content = await readFile(TARGET_FILE, 'utf-8');

  const jsonStr = JSON.stringify(credentials, null, 2);
  
  // Replace the BUS_CREDENTIALS array
  content = content.replace(
    /const BUS_CREDENTIALS = \[[\s\S]*?\];/,
    `const BUS_CREDENTIALS = ${jsonStr};`
  );

  await writeFile(TARGET_FILE, content);
  console.log("✨ Done! simulateBuses.ts has been updated.");
  
  await prisma.$disconnect();
}

setup().catch(err => {
    console.error(err);
    prisma.$disconnect();
});
