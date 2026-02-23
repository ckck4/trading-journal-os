const connStr = 'postgresql://postgres:3eL31nbc81S087Pf@db.tyqiutuslbbjplogheab.supabase.co:5432/postgres';
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

    const query = `
    SELECT
      tc.constraint_name,
      tc.constraint_type
    FROM information_schema.table_constraints AS tc
    WHERE tc.table_name = 'daily_summaries';
  `;
    const result = await pool.query(query);
    console.log("Constraints on daily_summaries:");
    console.table(result.rows);
    process.exit(0);
}
run();
