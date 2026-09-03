const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
const verifyRoute = require('./routes/verify');
const registerRoute = require('./routes/register');
const transferRoute = require('./routes/transfer');
const dashboardRoute = require('./routes/dashboard');
const productsRoute = require('./routes/products');
const authRoute = require('./routes/auth');

app.use('/api/verify', verifyRoute);
app.use('/api/register', registerRoute);
app.use('/api/transfer', transferRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/products', productsRoute);
app.use('/api/auth', authRoute);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`VeriChain Backend Server with SQLite listening on port ${port}`);
});
