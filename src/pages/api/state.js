import db from '../../utils/db.js';

export const GET = async ({ url }) => {
  try {
    const id = url.searchParams.get('id') || 'current';
    const row = db.prepare('SELECT data FROM simulation_state WHERE id = ?').get(id);
    
    if (row && row.data) {
      return new Response(row.data, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("API GET Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST = async ({ request }) => {
  try {
    const text = await request.text();
    if (!text) {
        return new Response(JSON.stringify({ success: true, message: 'Empty body, no action' }), { status: 200 });
    }
    
    const state = JSON.parse(text);
    const id = state.recordId || 'current';
    const data = JSON.stringify(state);
    
    const stmt = db.prepare(`
      INSERT INTO simulation_state (id, data, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET 
        data = excluded.data, 
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(id, data);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("API POST Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
