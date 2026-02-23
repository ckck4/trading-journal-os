const connStr = 'postgresql://postgres:3eL31nbc81S087Pf@db.tyqiutuslbbjplogheab.supabase.co:5432/postgres';
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

    const query = `
    ALTER TABLE prop_templates ADD COLUMN IF NOT EXISTS max_loss_limit numeric(10,2);
  `;
    try {
        await pool.query(query);
        console.log("Migration successful");
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}
run();
