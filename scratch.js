const { Client } = require('pg');

async function test() {
  // Try connecting to a non-existent or real DB doesn't matter, we just want to see if query rejects on destroy.
  // We'll mock a socket to just be a fake stream to test promise rejection.
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: '123' });
  try {
    await c.connect();
    console.log('Connected');
    const p = c.query('SELECT pg_sleep(5)');
    p.then(() => console.log('Query done'))
     .catch(e => console.log('Query error:', e.message));
     
    setTimeout(() => {
      console.log('Destroying stream...');
      c.connection.stream.destroy();
    }, 1000);
  } catch (e) {
    console.log('Connect error:', e.message);
  }
}
test();
