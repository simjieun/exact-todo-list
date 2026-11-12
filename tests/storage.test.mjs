import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { answer } from '../app.ts';

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'daily-todo-'));
  const storage = { sqlite: { open: async () => {
    const db = new DatabaseSync(join(dir, 'todos.db'));
    const execute = async (sql, params = []) => { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes), lastInsertRowid: BigInt(r.lastInsertRowid) }; };
    return {
      query: async (sql, params = []) => { const q = db.prepare(sql); q.setReadBigInts(true); q.setReturnArrays(true); return { rows: q.all(...params) }; },
      execute,
      transaction: async steps => { db.exec('BEGIN'); try { for (const s of steps) await execute(s.sql, s.params); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } },
      close: async () => db.close(),
    };
  } } };
  return { call: (source, ...args) => answer(source, args, {}, storage, {}), clean: () => rmSync(dir, { recursive: true }) };
}
test('persistent CRUD, isolated dates, stable IDs, literal SQL input', async () => {
  const { call, clean } = fixture();
  try {
    assert.equal((await call('addTask', '2026-11-12', '  책 읽기  ')).ok, true);
    await call('addTask', '2026-11-13', "Robert'); DROP TABLE todos;--");
    let day = await call('loadDay', '2026-11-12');
    assert.equal(day.total, 1); assert.equal(day.items[0].title, '책 읽기');
    assert.equal(day.previous, '2026-11-11'); assert.equal(day.next, '2026-11-13');
    await call('setDone', '1', true); await call('renameTask', '1', '책 20쪽');
    day = await call('loadDay', '2026-11-12');
    assert.equal(day.done, 1); assert.equal(day.items[0].title, '책 20쪽');
    await call('deleteTask', '1');
    await call('addTask', '2026-11-12', '산책');
    assert.equal((await call('loadDay', '2026-11-12')).items[0].id, '3');
    assert.equal((await call('loadDay', '2026-11-13')).total, 1);
  } finally { clean(); }
});
test('invalid writes never alter saved rows, leap day and year transitions', async () => {
  const { call, clean } = fixture();
  try {
    for (const [date, title] of [['2026-02-30', 'bad'], ['2026-01-01', '   '], ['2026-01-01', 'a'.repeat(201)]]) assert.equal((await call('addTask', date, title)).ok, false);
    assert.equal((await call('loadDay', '2026-01-01')).total, 0);
    assert.equal((await call('loadDay', '2028-02-28')).next, '2028-02-29');
    assert.equal((await call('loadDay', '2026-12-31')).next, '2027-01-01');
    assert.equal((await call('renameTask', '999', 'lost')).ok, false);
  } finally { clean(); }
});
test('rapid writes are all retained and storage failures are reported', async () => {
  const { call, clean } = fixture();
  try {
    await Promise.all(Array.from({ length: 20 }, (_, i) => call('addTask', '2026-11-12', `Task ${i}`)));
    assert.equal((await call('loadDay', '2026-11-12')).total, 20);
    const storage = { sqlite: { open: async () => { throw new Error('Disk full'); } } };
    const r = await answer('addTask', ['2026-11-12', 'Keep draft'], {}, storage, {});
    assert.equal(r.ok, false); assert.equal(r.error, 'Disk full');
  } finally { clean(); }
});
