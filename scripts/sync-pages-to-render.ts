import fetch from 'node-fetch';

// Local Strapi instance
const LOCAL_API_URL = 'http://localhost:1337/api';
const LOCAL_API_KEY = '6a28feea84d4aca1ab5c397e60a98e10754931cfb8d1e520df94454cc2bc5a9cc5759d2362e0592af5bcca0e6d3f3fb36e48932e22e853bd5d89e767f08b15540c121f340d22e5f0fa1aee95795a92ee8a74b4fb9abfd60cb8f418d3e3ed8fd3ee8f2a2042feaabb1f6cb45af0a6d37408c5103babefd020c974b0b536bc3c7f'; // Replace with your actual API key

// Render deployment
const RENDER_API_URL = 'https://serwise-strapi.onrender.com/api';
const RENDER_API_KEY = 'f4eccc44c4419a4e4836ee925ffd94300330212b5f40bd398d42a4c6f9d3ca35a136b98b252a4b3e41ba2080d57abd874873543eacc76f2858d3ab2712c115389aec6b9d67f063671cbe548d3798429e7243bb8f579cd71992e2fce6166698aff2fa5a7e9f6baf73b5636de7535e4595e0141440d274a6bbda7eaf63eec49b30';

const MAX_RETRIES = 60;
const RETRY_DELAY = 2000;

interface Page {
  id: string | number;
  documentId: string;
  handle: string;
  page_title: string;
  blocks: any[];
  environment?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function waitForStrapi(retries = 0): Promise<void> {
  try {
    const response = await fetch(`${LOCAL_API_URL}/pages`,
       {
        method: 'GET',
        headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LOCAL_API_KEY}`,
            }
          }
    );
    if (response.ok) {
      console.log('✓ Local Strapi is ready!\n');
      return;
    }
  } catch (e) {
    if (retries < MAX_RETRIES) {
      console.log(`⏳ Waiting for Local Strapi... (${retries}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return waitForStrapi(retries + 1);
    }
  }
  throw new Error('Could not connect to Local Strapi after retries');
}

async function fetchPagesFromLocal(): Promise<Page[]> {
  console.log('📖 Fetching pages from local Strapi...\n');

  try {
    const response = await fetch(`${LOCAL_API_URL}/pages?pagination[limit]=1000&populate=*`,{
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOCAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pages: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const pages = data.data || [];

    console.log(`✓ Found ${pages.length} pages\n`);
    return pages;
  } catch (error: any) {
    console.error(`❌ Error fetching pages: ${error.message}`);
    throw error;
  }
}

async function syncPagesToRender(pages: Page[]): Promise<void> {
  console.log('🚀 Syncing pages to Render deployment...\n');

  let successCount = 0;
  let skipCount = 0;

  console.log(`Debug: Total pages to sync: ${pages.length}`);
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    try {
      console.log(`\nDebug: Processing page ${i + 1}/${pages.length}`);
      
      if (!page) {
        console.log(`    ⚠️  Skipping page ${i + 1}: Page is null or undefined`);
        skipCount++;
        continue;
      }

      if (!page.handle || !page.page_title) {
        console.log(`    ⚠️  Skipping page ${i + 1}: Missing required fields - handle: ${page.handle}, page_title: ${page.page_title}`);
        skipCount++;
        continue;
      }

      const pageTitle = page.page_title || page.id;
      const environment = page.environment || 'DEVELOPMENT'; // Default to DEVELOPMENT

      // Check if page already exists on Render by handle
      const existingResponse = await fetch(
        `${RENDER_API_URL}/pages?filters[handle][$eq]=${encodeURIComponent(page.handle)}&pagination[limit]=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RENDER_API_KEY}`,
          },
        }
      );

      if (existingResponse.ok) {
        const existingData = await existingResponse.json() as any;
        if (existingData.data && existingData.data.length > 0) {
          // Update existing page
          const existingId = existingData.data[0].id;
          const updateResponse = await fetch(`${RENDER_API_URL}/pages/${existingId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RENDER_API_KEY}`,
            },
            body: JSON.stringify({
              data: {
                handle: page.handle,
                page_title: page.page_title,
                blocks: page.blocks,
                environment: environment,
              },
            }),
          });

          if (!updateResponse.ok) {
            const error = await updateResponse.json();
            console.error(`    ❌ Error updating "${pageTitle}": ${JSON.stringify(error)}`);
            continue;
          }

          console.log(`    ✓ Updated: ${pageTitle} [${environment}]`);
          successCount++;
          continue;
        }
      }

      // Create new page
      const createBody = {
        data: {
          handle: page.handle,
          page_title: page.page_title,
          blocks: page.blocks,
          // environment: environment, // Comment out if field doesn't exist on Render schema
        },
      };
      
      console.log(`Debug: Creating with body:`, JSON.stringify(createBody).substring(0, 200));
      
      const createResponse = await fetch(`${RENDER_API_URL}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RENDER_API_KEY}`,
        },
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error(`    ❌ Error creating "${pageTitle}": ${JSON.stringify(error)}`);
        continue;
      }

      const result = await createResponse.json() as any;
      console.log(`    ✓ Created: ${pageTitle} [${environment}]`);
      successCount++;
    } catch (error: any) {
      console.error(`    ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n✓ Sync completed: ${successCount} pages synced, ${skipCount} skipped`);
}

async function syncPages(): Promise<void> {
  try {
    console.log('🌱 Starting pages sync to Render...\n');
    await waitForStrapi();
    const pages = await fetchPagesFromLocal();
    await syncPagesToRender(pages);

    console.log('\n✅ Pages sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

syncPages();
