import pg from 'pg';
const { Client } = pg;
const name = process.argv[2] ?? 'sis_ph7_s6_test';
const base = new URL(process.env.DATABASE_URL);
const admin = new Client({
  host: base.hostname,
  port: base.port,
  user: decodeURIComponent(base.username),
  password: decodeURIComponent(base.password),
  database: 'postgres',
});
await admin.connect();
await admin.query(
  'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
  [name],
).catch(() => {});
await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
await admin.query(`CREATE DATABASE "${name}"`);
console.log(`DB-READY:${name}`);
await admin.end();
