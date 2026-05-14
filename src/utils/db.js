import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'simulation.db');
const db = new Database(dbPath);

// Initialize the database table
db.exec(`
  CREATE TABLE IF NOT EXISTS simulation_state (
    id TEXT PRIMARY KEY,
    data TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
