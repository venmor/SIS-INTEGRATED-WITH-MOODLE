import pg from 'pg';
const c = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'sis',
  password: 'sis_local_only',
  database: 'sis_ph8_intops_test',
});
await c.connect();
await c.query(
  `UPDATE "ProgrammeOffering" SET deadline = NOW() + INTERVAL '90 days' WHERE availability = 'OPEN'`,
);
console.log('DEADLINE-BUMPED');
await c.end();
