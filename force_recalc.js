const fs = require('fs');

async function run() {
    const accountId = "5543c7b8-3e91-4aa7-9577-7bb69f70d2ca"; // need to get this from DB
    const userId = "c1b52bc7-feab-4959-bee2-6f2df6cecf33";   // need to get this from DB
    // wait, I can just query DB for distinct account_id and user_id from trades
    const connStr = 'postgresql://postgres:3eL31nbc81S087Pf@db.tyqiutuslbbjplogheab.supabase.co:5432/postgres';
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

    const trades = await pool.query('SELECT DISTINCT user_id, account_id, trading_day FROM trades WHERE account_id IS NOT NULL');
    const toRecalc = trades.rows;

    fs.writeFileSync('C:\\Users\\proch\\Desktop\\TRADINGJOURNAL\\to_recalc.json', JSON.stringify(toRecalc, null, 2));

    // Let's also delete all from daily_summaries
    await pool.query('DELETE FROM daily_summaries');

    process.exit(0);
}
run();
