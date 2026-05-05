// Simulate createNewApiToken from /opt/cardvela
const BetterSqlite3 = require('./node_modules/better-sqlite3');
const SQLITE_PATH = '/opt/new-api/data/one-api.db';

// Test SQLite read
try {
  const db = new BetterSqlite3(SQLITE_PATH, { readonly: true, fileMustExist: true });
  const row = db.prepare('SELECT id, key FROM tokens WHERE name = ? ORDER BY id DESC LIMIT 1').get('test-pplx-1777969974');
  console.log('SQLite read OK:', row ? `id=${row.id} key=sk-${row.key.slice(0,8)}...` : 'not found');
  db.close();
} catch (e) {
  console.error('SQLite FAIL:', e.message);
}
