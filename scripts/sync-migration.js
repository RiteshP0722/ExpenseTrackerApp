// Copies supabase/schema.sql into the local Supabase migration so
// `npx supabase db reset` uses the same schema as the cloud project.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");
const header =
  "-- Local Supabase migration: an exact copy of supabase/schema.sql.\n" +
  "-- If you change schema.sql, copy it here again (npm run db:sync).\n\n";
fs.writeFileSync(path.join(root, "supabase", "migrations", "20261030000000_schema.sql"), header + schema);
console.log("Copied schema.sql into supabase/migrations.");
