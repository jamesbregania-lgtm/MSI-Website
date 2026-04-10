require('dotenv').config();
const app = require('./app');
const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://192.168.254.195:${PORT}`);
});