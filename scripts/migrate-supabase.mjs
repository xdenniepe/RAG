#!/usr/bin/env node

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

async function loadEnvFiles() {
  try {
    const dotenv = await import("dotenv");
    for (const name of [".env.local", ".env"]) {
      const p = join(root, name);
      if (existsSync(p)) {
        dotenv.config({ path: p });
      }
    }
  } catch {
    // dotenv optional: rely on exported env vars
  }
}

function parseArgs(argv) {
  const out = {
    dir: join(root, "supabase", "migrations"),
    dryRun: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "--dir" && argv[i + 1]) {
      out.dir = resolve(argv[++i]);
    } else if (a === "--help" || a === "-h") {
      console.log(`
migrate-supabase.mjs — apply ordered .sql files to Postgres

  DATABASE_URL   Required (unless dry-run). Use Supabase "Connection string" (URI).

Options:
  --dir <path>   Migrations directory (default: ./supabase/migrations)
  --dry-run      List files that would run; do not connect
  --force        Re-apply all files (ignore migration ledger)
  --help

The script records applied filenames in public._sql_migrations (created on first run).
`);
      process.exit(0);
    }
  }
  return out;
}

async function main() {
  await loadEnvFiles();
  const args = parseArgs(process.argv);

  const files = readdirSync(args.dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql files in ${args.dir}`);
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(`Would run ${files.length} migration(s) from ${args.dir}:`);
    for (const f of files) console.log(`  ${f}`);
    process.exit(0);
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    process.env.SUPABASE_DB_URL;
  if (!databaseUrl || !databaseUrl.startsWith("postgres")) {
    console.error(
      "Set DATABASE_URL (or DIRECT_URL) to your Postgres URI from Supabase → Settings → Database → Connection string.",
    );
    process.exit(1);
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : "";
    if (code === "ENOTFOUND") {
      let host = "";
      try {
        host = new URL(databaseUrl).hostname;
      } catch {
        /* ignore */
      }
      console.error(`
DNS could not resolve the database host${host ? `: ${host}` : ""}.

Fix:
  1. Supabase Dashboard → Settings → Database → copy "URI" again (project ref must match).
  2. Ensure the project is not paused and the URL is from the same project.
  3. Try the Pooler connection string (port 6543) if direct db.<ref>.supabase.co fails on your network.
  4. Check VPN / DNS (e.g. \`dig ${host || "db.<ref>.supabase.co"}\`).

Original error: ${err instanceof Error ? err.message : err}
`);
      process.exit(1);
    }
    throw err;
  }

  try {
    await client.query(`
      create table if not exists public._sql_migrations (
        id serial primary key,
        filename text not null unique,
        applied_at timestamptz not null default now()
      );
    `);

    const applied = new Set();
    if (!args.force) {
      const { rows } = await client.query(
        "select filename from public._sql_migrations order by filename",
      );
      for (const r of rows) applied.add(r.filename);
    }

    for (const filename of files) {
      if (!args.force && applied.has(filename)) {
        console.log(`skip (already applied): ${filename}`);
        continue;
      }

      const fullPath = join(args.dir, filename);
      const sql = readFileSync(fullPath, "utf8");

      console.log(`applying: ${filename}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        if (!args.force) {
          await client.query(
            "insert into public._sql_migrations (filename) values ($1) on conflict (filename) do nothing",
            [filename],
          );
        }
        await client.query("COMMIT");
        console.log(`ok: ${filename}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("Migrations finished.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
