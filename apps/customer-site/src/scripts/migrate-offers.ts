
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE URL or SERVICE ROLE KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Starting migration for Special Offers...');
    const sqlPath = "C:\\Users\\amend\\.gemini\\antigravity\\brain\\3c5098c6-ec2f-4583-8946-ecffe7b396f0\\special_offers.sql";
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`Executing full SQL block...`);

    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (rpcError) {
        console.error('Migration FAILED');
        console.error('Error:', rpcError.message);
    } else {
        console.log('Migration SUCCESS');
    }

    console.log('Migration completed.');
}

runMigration();
