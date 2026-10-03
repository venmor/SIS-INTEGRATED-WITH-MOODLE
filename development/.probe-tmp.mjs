import pg from 'pg';
const c = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'sis',
  password: 'sis_local_only',
  database: 'sis_ph8_browser_test',
});
await c.connect();
const r = await c.query(
  'SELECT status, version, "rootCause", "recoveryEvidence" FROM "OpsIncident";',
);
console.log(JSON.stringify(r.rows));
await c.end();
