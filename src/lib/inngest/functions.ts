import { inngest } from "./client";

/**
 * Minimal test function — confirms Inngest connectivity.
 * Trigger via Inngest dev dashboard: send event "test/hello.world"
 */
export const helloWorld = inngest.createFunction(
    { id: "hello-world", name: "Hello World Test" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        await step.run("log-event", async () => {
            console.log("[Inngest] Hello from Trading Journal OS!", event.data);
            return { message: "Hello World", receivedAt: new Date().toISOString() };
        });

        return { success: true };
    }
);
