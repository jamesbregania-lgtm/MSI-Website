require('dotenv').config();
const os = require('os');
const app = require('./app');
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

app.listen(PORT, HOST, () => {
  const addresses = getLocalIpAddresses();
  console.log(`Server running at http://localhost:${PORT}`);
  addresses.forEach(address => {
    console.log(`Server running at http://${address}:${PORT}`);
  });
});