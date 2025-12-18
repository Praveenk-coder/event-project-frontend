require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('../config/db');

const authRoutes = require('../routes/auth');
const eventRoutes = require('../routes/events');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

// Connect DB once
let isConnected = false;
async function connectOnce() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}
connectOnce();

module.exports = app; // important for serverless
