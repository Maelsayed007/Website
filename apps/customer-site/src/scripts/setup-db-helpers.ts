
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log('Setting up exec_sql helper function...');

    // NOTE: This usually requires high privileges (Service Role Key)
    const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
     `
    });

    if (error && error.message.includes('Could not find the function')) {
        console.log('exec_sql function not found, cannot use RPC to create it.');
        console.log('Please run the following SQL manually in the Supabase Dashboard SQL Editor:');
        console.log(`
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    } else if (error) {
        console.error('Error creating function:', error);
    } else {
        console.log('Successfully created exec_sql function via RPC?! Wait, that should not be possible if it did not exist.');
    }
}

setup();
