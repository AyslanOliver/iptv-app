const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy para API principal
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://zeusodin.online',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '',
      },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('Accept', 'application/json');
      },
    })
  );

  // Proxy para streams de vídeo
  app.use(
    '/stream',
    createProxyMiddleware({
      target: 'http://zeusodin.online',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/stream': '',
      },
      onProxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Accept', '*/*');
        proxyReq.setHeader('Range', req.headers.range || 'bytes=0-');
      },
      onProxyRes: (proxyRes) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Range, Content-Range, Content-Length';
      },
    })
  );

  // Proxy para EPG XMLTV
  app.use(
    '/epg',
    createProxyMiddleware({
      target: 'http://zed7.top',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/epg': '/xmltv.php',
      },
      onProxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Accept', 'application/xml, text/xml, */*');
      },
      onProxyRes: (proxyRes) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type';
      },
    })
  );

};
