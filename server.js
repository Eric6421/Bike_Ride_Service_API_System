const { createApp } = require("./src/app");
const {
  openDatabase,
  initializeSchema,
  closeDatabase,
} = require("./src/database");

/**
 * Defines the HTTP port used by the API server.
 * PORT environment variable is respected for deployment flexibility.
 */
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

/**
 * Bootstraps the service by opening DB, initializing schema, and starting Express.
 * @returns {Promise<void>} Resolves once startup sequence completes.
 */
async function startServer() {
  const db = await openDatabase();
  await initializeSchema(db);

  const app = createApp(db);
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Bike Ride Service API listening on port ${PORT}`);
  });

  /**
   * Handles graceful shutdown so database connections are closed cleanly.
   * @param {NodeJS.Signals} signal - Process signal that triggered shutdown.
   * @returns {Promise<void>} Resolves after server and DB have closed.
   */
  async function gracefulShutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down gracefully...`);

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await closeDatabase(db);
    process.exit(0);
  }

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start Bike Ride Service API:", error);
  process.exit(1);
});
