import type { Answer, Database, Result, Sources, Storage } from './app.contract.d.ts';

export const appId = 'com.joy.dailytodo';
export const grants = 'sqlite.open app:/data/todos.db';
const DB = 'app:/data/todos.db';

function validDay(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('올바른 날짜를 선택해 주세요.');
  const d = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== day) throw new Error('올바른 날짜를 선택해 주세요.');
  return day;
}
function adjacent(day: string, offset: number): string {
  const d = new Date(`${validDay(day)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function titleOf(text: string): string {
  const title = text.trim();
  if (!title) throw new Error('할 일을 입력해 주세요.');
  if (title.length > 200) throw new Error('할 일은 200자 이내로 입력해 주세요.');
  return title;
}
function idOf(id: string): bigint {
  if (!/^[1-9][0-9]*$/.test(id)) throw new Error('할 일을 찾을 수 없어요.');
  const n = BigInt(id);
  if (n > 9223372036854775807n) throw new Error('올바르지 않은 ID예요.');
  return n;
}
async function use<T>(storage: Storage, work: (db: Database) => Promise<T>): Promise<T> {
  const db = await storage.sqlite.open(DB);
  try {
    const schema = await db.query("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='todos'");
    if (!schema.rows.length) {
      await db.transaction([
        { sql: 'CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)' },
        { sql: 'CREATE INDEX IF NOT EXISTS todos_day ON todos(day)' },
      ]);
    }
    return await work(db);
  } finally { await db.close(); }
}
async function write(work: () => Promise<unknown>): Promise<Result<'addTask'>> {
  try { await work(); return { ok: true, error: '' }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : '저장하지 못했어요. 다시 시도해 주세요.' }; }
}
const sources: Sources = {
  loadDay: ([day], _store, storage) => use(storage, async db => {
    validDay(day);
    const result = await db.query('SELECT id, title, done FROM todos WHERE day=? ORDER BY done ASC, id ASC', [day]);
    const items = result.rows.map(row => ({ id: String(row[0]), title: String(row[1]), done: row[2] === 1n }));
    return { items, total: items.length, done: items.filter(item => item.done).length, previous: adjacent(day, -1), next: adjacent(day, 1) };
  }),
  addTask: ([day, text], _store, storage) => write(() => {
    const title = titleOf(text); validDay(day);
    return use(storage, db => db.execute('INSERT INTO todos (day,title) VALUES (?,?)', [day, title]));
  }),
  setDone: ([id, done], _store, storage) => write(() => use(storage, async db => {
    const r = await db.execute('UPDATE todos SET done=? WHERE id=?', [done ? 1n : 0n, idOf(id)]);
    if (r.changes !== 1) throw new Error('할 일이 이미 삭제되었어요.');
  })),
  renameTask: ([id, text], _store, storage) => write(() => {
    const title = titleOf(text);
    return use(storage, async db => {
      const r = await db.execute('UPDATE todos SET title=? WHERE id=?', [title, idOf(id)]);
      if (r.changes !== 1) throw new Error('할 일이 이미 삭제되었어요.');
    });
  }),
  deleteTask: ([id], _store, storage) => write(() => use(storage, db => db.execute('DELETE FROM todos WHERE id=?', [idOf(id)]))),
};
// Serialize reads and writes so a refresh cannot race another operation in this session.
let tail: Promise<unknown> = Promise.resolve();
export const answer: Answer = (source, args, store, storage, native) => {
  const result = tail.then(() => sources[source](args, store, storage, native));
  tail = result.catch(() => {});
  return result;
};
