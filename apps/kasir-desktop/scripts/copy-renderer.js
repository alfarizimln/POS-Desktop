const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Database schema → dist/main/database/
const srcSchema = path.join(root, 'src', 'main', 'database', 'schema.sql');
const outSchema = path.join(root, 'dist', 'main', 'database', 'schema.sql');
fs.mkdirSync(path.dirname(outSchema), { recursive: true });
fs.copyFileSync(srcSchema, outSchema);

console.log('Aset disalin ke dist/');