const fs = require('fs');
const connStr = 'postgresql://postgres:3eL31nbc81S087Pf@db.tyqiutuslbbjplogheab.supabase.co:5432/postgres';
const { Pool } = require('pg');

async function run() {
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

    const query = `
    SELECT
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    FROM
      pg_class t,
      pg_class i,
      pg_index ix,
      pg_attribute a
    WHERE
      t.oid = ix.indrelid
      and i.oid = ix.indexrelid
      and a.attrelid = t.oid
      and a.attnum = ANY(ix.indkey)
      and t.relkind = 'r'
      and t.relname = 'daily_summaries';
  `;
    const result = await pool.query(query);
    fs.writeFileSync('C:\\Users\\proch\\Desktop\\TRADINGJOURNAL\\db_indexes.json', JSON.stringify(result.rows, null, 2));
    process.exit(0);
}
run();
