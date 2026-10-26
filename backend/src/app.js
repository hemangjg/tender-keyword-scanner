const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');
const api = require('./routes/api');

const app = express();
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','), exposedHeaders: ['Content-Disposition'] }));
app.use(express.json());
app.use('/api', api);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err instanceof multer.MulterError ? 400 : err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

module.exports = app;
