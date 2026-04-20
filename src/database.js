const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

/**
 * Defines the on-disk folder where the SQLite database file is stored.
 * Keeping DB artifacts in a dedicated folder avoids cluttering the project root.
 */
const DATA_DIR = path.join(__dirname, "..", "data");

/**
 * Defines the full path to the SQLite database file used by the service.
 */
const DB_PATH = path.join(DATA_DIR, "bike_ride_service.sqlite");

/**
 * Ensures the data directory exists before opening SQLite.
 * This prevents runtime failures when SQLite tries to create a file in a missing folder.
 */
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Opens a SQLite connection and returns a Promise-wrapped database object.
 * @returns {Promise<sqlite3.Database>} Resolves with an open sqlite3 Database instance.
 */
function openDatabase() {
  ensureDataDirectory();

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(db);
    });
  });
}

/**
 * Executes a SQL statement that does not return rows.
 * @param {sqlite3.Database} db - Open database connection.
 * @param {string} sql - SQL query to execute.
 * @param {Array<unknown>} params - Positional SQL parameters.
 * @returns {Promise<{lastID:number,changes:number}>} Metadata from sqlite3 run callback.
 */
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRunComplete(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Executes a SQL query and returns the first row or undefined.
 * @param {sqlite3.Database} db - Open database connection.
 * @param {string} sql - SQL query to execute.
 * @param {Array<unknown>} params - Positional SQL parameters.
 * @returns {Promise<object|undefined>} A single matching row.
 */
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

/**
 * Executes a SQL query and returns all matching rows.
 * @param {sqlite3.Database} db - Open database connection.
 * @param {string} sql - SQL query to execute.
 * @param {Array<unknown>} params - Positional SQL parameters.
 * @returns {Promise<object[]>} All matching rows.
 */
function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

/**
 * Creates required tables if they are missing.
 * @param {sqlite3.Database} db - Open database connection.
 * @returns {Promise<void>} Resolves when schema setup is complete.
 */
async function initializeSchema(db) {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bike_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL CHECK(status IN ('started', 'ended'))
    )`
  );
}

/**
 * Closes an open SQLite connection.
 * @param {sqlite3.Database} db - Open database connection.
 * @returns {Promise<void>} Resolves when the connection is closed.
 */
function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = {
  openDatabase,
  run,
  get,
  all,
  initializeSchema,
  closeDatabase,
};
