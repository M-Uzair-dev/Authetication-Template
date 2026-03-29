import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import prisma from "../lib/prisma.js";
import { tokenCleanupQueue } from "../queues/tokenCleanup.queue.js";

const cleanupWorker = new Worker(
  "tokenCleanupQueue",
  async (job) => {
    console.log("Cleaning expired tokens...");
    await prisma.token.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  },
  {
    connection: redisConnection,
  },
);

cleanupWorker.on("completed", () => {
  console.log("Cleaned tokens!");
});

await tokenCleanupQueue.upsertJobScheduler(
  "token-cleanup",
  { pattern: "*/10 * * * *" },
  { name: "Cleanup-job", data: {} },
);
