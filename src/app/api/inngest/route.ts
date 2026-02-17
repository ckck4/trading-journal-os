import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { helloWorld } from "@/lib/inngest/functions";

// Serve the Inngest API — this registers all functions with Inngest
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        helloWorld,
        // Future functions will be added here:
        // importCsv,
        // reconstructTrades,
        // recalcSummaries,
        // evaluatePropRules,
        // generateInsights,
    ],
});
