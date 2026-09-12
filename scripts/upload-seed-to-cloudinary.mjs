import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { writeFile } from 'node:fs/promises';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const SEED_DIR = 'public/seed';
const MAP_FILE = 'scripts/cloudinary-seed-map.json';

async function main() {
  console.log('Reading seed images...');
  let files;
  try {
    files = (await readdir(SEED_DIR)).filter((f) => f.endsWith('.jpg')).sort();
  } catch (err) {
    console.error('Failed to read public/seed. Make sure you ran `npm run seed:images` first.', err);
    process.exit(1);
  }
  
  const map = {
    pool: [],
    room: [],
    lawn: []
  };

  console.log(`Found ${files.length} images to upload.`);

  for (const f of files) {
    const group = f.split('-')[0];
    const localPath = path.join(SEED_DIR, f);
    
    // Check if this is a group we care about
    if (!map[group]) {
      console.warn(`Skipping unknown group for file: ${f}`);
      continue;
    }

    try {
      console.log(`Uploading ${f}...`);
      const result = await cloudinary.uploader.upload(localPath, {
        folder: 'seed', // Store them in a 'seed' folder in Cloudinary
        use_filename: true,
        unique_filename: false,
        overwrite: true,
      });

      // Save the secure URL to the map
      map[group].push(result.secure_url);
    } catch (error) {
      console.error(`Failed to upload ${f}:`, error.message);
    }
  }

  // Write the map file
  await writeFile(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`\nUpload complete! Map saved to ${MAP_FILE}`);
}

main().catch(console.error);
