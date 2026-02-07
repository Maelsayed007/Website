
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Starting migration...');
    const sqlPath = path.resolve(__dirname, '../migrations/definitive_restaurant_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements
    // This is a simple split, it might not work for complex SQL with semicolons in strings/functions
    // but for our current schema it should be fine.
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        // We try to execute each statement. Since there's no direct 'query' method in Supabase client,
        // we use a trick: we use the .rpc('exec_sql', { sql_query: statement }) if it exists,
        // OR we try to use a dummy select/insert if we can't do arbitrary SQL.
        // WAIT: Supabase client DOES NOT support arbitrary SQL execution without a helper function.

        // If we reach here, we REALLY need exec_sql or to use the dashboard.
        // Let's try to check if it exists first.
        const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (rpcError) {
            console.error(`FAILED: ${statement.substring(0, 100)}`);
            console.error('Error:', rpcError.message);

            if (rpcError.message.includes('Could not find the function')) {
                console.error('CRITICAL: exec_sql function is missing. Please create it first in the Supabase Dashboard.');
                process.exit(1);
            }
        } else {
            console.log('SUCCESS');
        }
    }

    console.log('Migration completed (with potential partial successes/failures).');
}

runMigration();
