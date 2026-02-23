const connStr = 'postgresql://postgres:3eL31nbc81S087Pf@db.tyqiutuslbbjplogheab.supabase.co:5432/postgres';
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

    const query = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prop_templates';
  `;
    const result = await pool.query(query);
    console.table(result.rows);
    process.exit(0);
}
run();
