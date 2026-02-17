import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./supabase/migrations",
    schema: "./src/lib/db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    // Prefix migration files with a sequential number for Supabase compatibility
    migrations: {
        prefix: "supabase",
    },
});
