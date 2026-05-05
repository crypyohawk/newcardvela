const db = require('better-sqlite3')('/opt/new-api/data/one-api.db', { readonly: true });
const rows = db.prepare('SELECT id, name, key FROM tokens ORDER BY id DESC LIMIT 5').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
