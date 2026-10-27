import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
// Load configuration before key modules initialize.
config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
config();
