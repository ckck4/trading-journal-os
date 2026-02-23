import fs from 'fs';
import path from 'path';
import { recalcSummaries } from './src/lib/services/recalc-summaries';

const configPath = require('path').resolve('./.env.local');
require('dotenv').config({ path: configPath });

async function run() {
    const data = JSON.parse(fs.readFileSync('C:\\Users\\proch\\Desktop\\TRADINGJOURNAL\\to_recalc.json', 'utf8'));

    // Sort data by trading_day to ensure cumulative PnL works
    data.sort((a: any, b: any) => new Date(a.trading_day).getTime() - new Date(b.trading_day).getTime());

    for (const row of data) {
        try {
            console.log(`Recalculating account ${row.account_id} for day ${row.trading_day}`);
            await recalcSummaries(row.user_id, row.account_id, row.trading_day);
        } catch (err) {
            console.error(`Error on ${row.trading_day}:`, err);
        }
    }

    console.log('Done');
}

run();
