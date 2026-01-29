const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  const apiUrl = process.env.VITE_API_URL || 'http://localhost:8080';

  app.use(
    '/api',
    proxy({
      target: apiUrl,
      changeOrigin: true,
    })
  );
};
