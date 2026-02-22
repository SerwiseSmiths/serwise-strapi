import fetch from 'node-fetch';

// This script will update every existing part, service and subscription
// record in the Strapi instance so that its `device_type` points to the
// device type with `type === 'RO'`.  It assumes that the RO device type
// already exists in the database.

const API_URL = 'https://serwise-strapi.onrender.com/api';
const API_KEY = process.env.STRAPI_API_KEY || 'f4eccc44c4419a4e4836ee925ffd94300330212b5f40bd398d42a4c6f9d3ca35a136b98b252a4b3e41ba2080d57abd874873543eacc76f2858d3ab2712c115389aec6b9d67f063671cbe548d3798429e7243bb8f579cd71992e2fce6166698aff2fa5a7e9f6baf73b5636de7535e4595e0141440d274a6bbda7eaf63eec49b30';

interface StrapiResponse<T> {
  data: T[];
}

async function getRoDeviceTypeId(): Promise<number> {
  const resp = await fetch(
    `${API_URL}/device-types?filters[type][$eq]=RO&pagination[limit]=1`,
    {
      headers: { Authorization: `Bearer ${API_KEY}` },
    }
  );
  const json = (await resp.json()) as StrapiResponse<any>;
  if (!json.data || json.data.length === 0) {
    throw new Error('RO device type not found');
  }
  return json.data[0].id;
}

async function updateRecords(endpoint: string, roId: number) {
  console.log(`
Updating ${endpoint}...`);

  const resp = await fetch(`${API_URL}/${endpoint}?pagination[limit]=1000&populate=*`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const json = (await resp.json()) as StrapiResponse<any>;
  for (const record of json.data) {
    const current = record.attributes.device_type?.data?.id;
    if (current === roId) continue;

    const updateResp = await fetch(`${API_URL}/${endpoint}/${record.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ data: { device_type: roId } }),
    });
    if (!updateResp.ok) {
      const err = await updateResp.text();
      console.error(`  ❌ failed to update ${endpoint}/${record.id}: ${err}`);
    } else {
      console.log(`  ✓ ${endpoint}/${record.id} set to RO`);
    }
  }
}

async function main() {
  try {
    const roId = await getRoDeviceTypeId();
    await updateRecords('subscriptions', roId);
    await updateRecords('services', roId);
    await updateRecords('parts', roId);
    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
