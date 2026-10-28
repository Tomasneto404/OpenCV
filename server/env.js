import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
// Load configuration before application services initialize.
config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
config();
