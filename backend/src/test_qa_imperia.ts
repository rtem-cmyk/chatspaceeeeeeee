import { db } from './db/database.js';

console.log("Testing shift-status...");
try {
  const operators = db.prepare(`
    SELECT id, username, full_name
    FROM users WHERE role = 'OPERATOR'
  `).all();
  
  for (const op of operators) {
    const activeChats = db.prepare(`
      SELECT c.id, c.lady_id,
        (SELECT sender_type FROM messages m WHERE m.chat_id = c.id ORDER BY m.sent_at DESC LIMIT 1) as last_sender_type,
        (SELECT sent_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.sent_at DESC LIMIT 1) as last_msg_time
      FROM chats c
      JOIN operator_assignments oa ON c.lady_id = oa.lady_id
      WHERE oa.operator_id = ? AND oa.is_active = 1 AND c.status = 'active'
    `).all((op as any).id);
  }
  console.log("shift-status OK");
} catch (e: any) {
  console.error("shift-status FAILED:", e.message);
}

console.log("Testing sender/tasks...");
try {
  const tasks = db.prepare(`
    SELECT st.*, l.name as lady_name 
    FROM sender_tasks st
    JOIN ladies l ON l.lady_id = st.lady_id
    WHERE l.assigned_operator_id = 1
    ORDER BY st.id DESC
  `).all();
  console.log("sender/tasks OK");
} catch (e: any) {
  console.error("sender/tasks FAILED:", e.message);
}

console.log("Testing /mass transaction...");
try {
  db.exec('BEGIN');
  const stmt = db.prepare(`
    INSERT INTO sender_tasks (lady_id, target_audience, template_text, speed_ms, status)
    VALUES (?, ?, ?, ?, 'running')
  `);
  stmt.run('LADY1', 'online', 'test', 5000);
  db.exec('COMMIT');
  console.log("/mass OK");
} catch (e: any) {
  console.error("/mass FAILED:", e.message);
  try { db.exec('ROLLBACK'); } catch {}
}

console.log("Testing /balance/logs...");
try {
  const logs = db.prepare(`
    SELECT cl.id, cl.action_type, cl.credits, cl.created_at, l.name as lady_name
    FROM credit_logs cl
    LEFT JOIN ladies l ON cl.lady_id = l.lady_id
    ORDER BY cl.created_at DESC
    LIMIT 100
  `).all();
  console.log("/balance/logs OK");
} catch(e: any) {
  console.error("/balance/logs FAILED:", e.message);
}

