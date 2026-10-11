/* Кестелер бірінші сұраныста өзі жасалады (IF NOT EXISTS), қолмен миграция қажет емес. */
export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS groups ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE )",
  "CREATE TABLE IF NOT EXISTS students ( id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE, full_name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 )",
  "CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id)",
  "CREATE TABLE IF NOT EXISTS sessions ( id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL, code TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL, work_started_at INTEGER, work_until INTEGER )",
  "CREATE TABLE IF NOT EXISTS attendance ( session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, variant INTEGER NOT NULL, joined_at INTEGER NOT NULL, device_id TEXT, manual INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (session_id, student_id) )",
  "CREATE TABLE IF NOT EXISTS submissions ( id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, task INTEGER NOT NULL, payload TEXT NOT NULL, signals TEXT, auto_score INTEGER, ai_score INTEGER, ai_pct INTEGER, ai_comment TEXT, flags TEXT, teacher_score INTEGER, teacher_comment TEXT, submitted_at INTEGER NOT NULL, UNIQUE (session_id, student_id, task) )",
  "CREATE TABLE IF NOT EXISTS results ( session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE, teacher_total INTEGER, teacher_comment TEXT, PRIMARY KEY (session_id, student_id) )",
  "CREATE TABLE IF NOT EXISTS task_starts (session_id INTEGER NOT NULL, student_id INTEGER NOT NULL, task INTEGER NOT NULL, started_at INTEGER NOT NULL, PRIMARY KEY (session_id, student_id, task))",
  "CREATE TABLE IF NOT EXISTS feedback (session_id INTEGER NOT NULL, student_id INTEGER NOT NULL, level INTEGER, learned TEXT, hard TEXT, comment TEXT, at INTEGER NOT NULL, PRIMARY KEY (session_id, student_id))",
  "CREATE TABLE IF NOT EXISTS bonus (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER NOT NULL, student_id INTEGER NOT NULL, points INTEGER NOT NULL, note TEXT, at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS runs (student_id INTEGER NOT NULL, at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS login_fails (ip TEXT NOT NULL, at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS join_fails ( student_id INTEGER NOT NULL, at INTEGER NOT NULL )"
];
