const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const routes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

const corsOptions = { origin: true, credentials: true };

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use((req, _res, next) => {
  const [pathname, query = ''] = String(req.url || '').split('?');
  const normalizedPathname = pathname.replace(/\/{2,}/g, '/');
  if (normalizedPathname !== pathname) {
    req.url = query ? `${normalizedPathname}?${query}` : normalizedPathname;
  }
  next();
});
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use('/', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
