import pg from 'pg';
const name = process.argv[2] ?? 'sis_ph8_test';
const admin = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'sis',
  password: 'sis_local_only',
  database: 'postgres',
});
await admin.connect();
await admin
  .query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
    [name],
  )
  .catch(() => {});
await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
await admin.query(`CREATE DATABASE "${name}"`);
console.log(`DB-READY:${name}`);
await admin.end();
