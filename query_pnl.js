const fs = require('fs');
const connStr = 'postgresql://postgres:3eL31nbc81S087Pf@db.tyqiutuslbbjplogheab.supabase.co:5432/postgres';

async function run() {
    try {
        const postgres = require('postgres');
        const sql = postgres(connStr, { ssl: 'require' });

        const summaries = await sql`SELECT trading_day as date, net_pnl FROM daily_summaries ORDER BY trading_day DESC LIMIT 10`;
        const tradesTotal = await sql`SELECT SUM(net_pnl) as total FROM trades WHERE account_id IS NOT NULL`;

        fs.writeFileSync('C:\\Users\\proch\\Desktop\\TRADINGJOURNAL\\pnl_verify.json', JSON.stringify({
            summaries: summaries,
            tradesTotal: tradesTotal[0].total
        }, null, 2));
        process.exit(0);
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
            const summaries = await pool.query('SELECT trading_day as date, net_pnl FROM daily_summaries ORDER BY trading_day DESC LIMIT 10');
            const tradesTotal = await pool.query('SELECT SUM(net_pnl) as total FROM trades WHERE account_id IS NOT NULL');

            fs.writeFileSync('C:\\Users\\proch\\Desktop\\TRADINGJOURNAL\\pnl_verify.json', JSON.stringify({
                summaries: summaries.rows,
                tradesTotal: tradesTotal.rows[0].total
            }, null, 2));
            process.exit(0);
        } else {
            console.error(e);
            process.exit(1);
        }
    }
}
run();
