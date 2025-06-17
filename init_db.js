const pool = require("./config");
const fs = require("fs");
const path = require("path");

async function initializeDatabase() {
  try {
    // Read SQL file
    const sql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");

    // Split SQL into individual statements
    const statements = sql
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase().catch(console.error);
