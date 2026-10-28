const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function readUsers(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
  try { fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function createTests(directory) {
  const file = id => path.join(directory, crypto.createHash('sha256').update(String(id)).digest('hex') + '.json');
  const read = id => readUsers(file(id));
  return { read, write(id, record) {
    const records = read(id);
    if (!records.some(item => item.id === record.id)) {
      records.unshift({ ...record, createdAt: new Date().toISOString() });
      atomicWrite(file(id), records.slice(0, 60));
    }
  }};
}
module.exports = { readUsers, atomicWrite, createTests };
