import fetch from 'node-fetch';

const API_URL = 'https://serwise-strapi.onrender.com/api';
const API_KEY = 'f4eccc44c4419a4e4836ee925ffd94300330212b5f40bd398d42a4c6f9d3ca35a136b98b252a4b3e41ba2080d57abd874873543eacc76f2858d3ab2712c115389aec6b9d67f063671cbe548d3798429e7243bb8f579cd71992e2fce6166698aff2fa5a7e9f6baf73b5636de7535e4595e0141440d274a6bbda7eaf63eec49b30';
const MAX_RETRIES = 60;
const RETRY_DELAY = 2000;

// Type definitions
interface Part {
  title: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
}

interface CategoryData {
  [key: string]: Part[];
}

// Parts data structure
const TAB_DATA: CategoryData = {
  Parts: [
    {
      title: 'Basic Filters',
      items: [
        { name: 'Spun Filter', qty: 0, price: 10 },
        { name: 'Pre Filter Bowl', qty: 0, price: 10 },
        { name: 'Sediment Filter', qty: 0, price: 10 },
        { name: 'Pre Carbon Filter', qty: 0, price: 10 },
        { name: 'Post Carbon Filter', qty: 0, price: 10 },
        { name: 'Inline Filter Set', qty: 0, price: 10 },
        { name: 'UF Big Filter', qty: 0, price: 10 },
        { name: 'UF Small Filter', qty: 0, price: 10 },
        { name: 'RO Membrane', qty: 0, price: 10 },
        { name: 'Alkaline Filter', qty: 0, price: 10 },
      ],
    },
    {
      title: 'Additional Filters',
      items: [
        { name: 'Copper Filter', qty: 0, price: 10 },
        { name: 'Magnesium Filter', qty: 0, price: 10 },
        { name: 'Zinc Filter', qty: 0, price: 10 },
        { name: 'Calcium Filter', qty: 0, price: 10 },
      ],
    },
    {
      title: 'Electrical Components',
      items: [
        { name: 'Booster Pump', qty: 0, price: 10 },
        { name: 'UV Lamp', qty: 0, price: 10 },
        { name: 'TDS Controller', qty: 0, price: 10 },
        { name: 'Power Supply Unit (SMPS)', qty: 0, price: 10 },
        { name: 'Float Switch', qty: 0, price: 10 },
        { name: 'Solenoid Valve (SV)', qty: 0, price: 10 },
      ],
    },
    {
      title: 'Other Items',
      items: [
        { name: 'Pump Head', qty: 0, price: 10 },
        { name: 'Electrical Wire Changes', qty: 0, price: 10 },
      ],
    },
  ],

  Repair: [
    {
      title: 'Pipe & Fittings',
      items: [
        { name: 'Booster Pump Repair', qty: 0, price: 10 },
        { name: 'Pump Head Repair', qty: 0, price: 10 },
        { name: 'Electrical Wire Repair', qty: 0, price: 10 },
      ],
    },
  ],

  Service: [
    {
      title: 'Core',
      items: [
        { name: 'Installation', qty: 0, price: 10 },
        { name: 'Uninstallation', qty: 0, price: 10 },
        { name: 'Basic Check-up', qty: 0, price: 10 },
      ],
    },
  ],
};

async function waitForStrapi(retries: number = 0): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/parts`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    if (response.ok) {
      console.log('✅ Connected to Strapi\n');
      return;
    }
  } catch (e) {
    if (retries < MAX_RETRIES) {
      console.log(`⏳ Waiting for Strapi... (${retries}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return waitForStrapi(retries + 1);
    }
  }
  throw new Error('Could not connect to Strapi after retries');
}

async function createParts(): Promise<void> {
  console.log('📦 Creating Parts...\n');

  let partsCount = 0;

  // Iterate through all types (Parts, Repair, Service)
  for (const [partType, categories] of Object.entries(TAB_DATA)) {
    console.log(`\n📂 Creating ${partType}:`);

    // Iterate through categories
    for (const category of categories) {
      console.log(`  📁 ${category.title}`);

      // Create each item
      for (const item of category.items) {
        try {
          const partData = {
            name: item.name,
            category: category.title,
            type: partType,
            price: item.price,
            quantity: item.qty,
            status: 'ACTIVE',
          };

          const response = await fetch(`${API_URL}/parts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({ data: partData }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error(`    ❌ Error creating "${item.name}": ${JSON.stringify(error)}`);
            continue;
          }

          const result = await response.json() as any;
          console.log(`    ✓ ${item.name} (${category.title}) - $${item.price}`);
          partsCount++;
        } catch (error: any) {
          console.error(`    ❌ Error: ${error.message}`);
        }
      }
    }
  }

  console.log(`\n✓ Total ${partsCount} parts created\n`);
}

async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Starting parts database seeding...\n');
    await waitForStrapi();
    await createParts();

    console.log('\n✅ Parts database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
