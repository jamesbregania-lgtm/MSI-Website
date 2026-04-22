require('dotenv').config();
const os = require('os');
const app = require('./app');
const { getDb, SQLITE_FILE, DATA_DIR } = require('./database/sqlite');
const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }

  return Array.from(new Set(addresses));
}

async function startServer() {
  await getDb();

  app.listen(PORT, HOST, () => {
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
    const addresses = getLocalIpAddresses();
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`SQLite database: ${SQLITE_FILE}`);
    console.log(`SQLite data dir: ${DATA_DIR}`);
    console.log(`Invite base URL: ${baseUrl}`);
    addresses.forEach(address => {
      console.log(`Server running at http://${address}:${PORT}`);
    });
  });
}

startServer().catch(error => {
  console.error('Failed to initialize application:', error);
  process.exit(1);
});