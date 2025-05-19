const supabase = require("./config");
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
      const { error } = await supabase.rpc("exec_sql", { sql: statement });
      if (error) {
        console.error("Error executing statement:", error);
        throw error;
      }
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
    throw err;
  }
}

// Run initialization
initializeDatabase().catch(console.error);
