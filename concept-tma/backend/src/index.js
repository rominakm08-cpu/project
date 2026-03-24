require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Init DB first
require('./db/schema');
console.log('✅ Database ready');

// Init Bot
require('./bot');
console.log('✅ Bot ready');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/creators', require('./routes/creators'));
app.use('/api/business', require('./routes/business'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV}`);
  console.log(`   App URL: ${process.env.APP_URL}`);
});
