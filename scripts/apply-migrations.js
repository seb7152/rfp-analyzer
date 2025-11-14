const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile, migrationName) {
  try {
    console.log(`Applying migration: ${migrationName}`);

    const fs = require("fs");
    const path = require("path");
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, "..", "supabase", "migrations", migrationFile),
      "utf8",
    );

    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error(`Error applying ${migrationName}:`, error);
      return false;
    }

    console.log(`Successfully applied ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`Error applying ${migrationName}:`, error);
    return false;
  }
}

async function main() {
  console.log("Starting migration application...");

  // Apply migrations in order
  const migrations = [
    {
      file: "010_add_weight_to_categories.sql",
      name: "Add weight to categories",
    },
    {
      file: "011_add_weight_update_functions.sql",
      name: "Add weight update functions",
    },
  ];

  for (const migration of migrations) {
    const success = await applyMigration(migration.file, migration.name);
    if (!success) {
      console.error(`Failed to apply ${migration.name}. Stopping.`);
      process.exit(1);
    }
  }

  console.log("All migrations applied successfully!");
}

main().catch(console.error);
