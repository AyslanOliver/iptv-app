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
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        proxyReq.setHeader('Accept', '*/*');
        proxyReq.setHeader('Accept-Encoding', 'gzip, deflate');
        proxyReq.setHeader('Connection', 'keep-alive');
        proxyReq.setHeader('Origin', 'http://localhost:3000');
        proxyReq.setHeader('Referer', 'http://localhost:3000/');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Adicionar cabeçalhos CORS
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        
        // Configurar cabeçalhos para streaming
        if (req.url && req.url.includes('.m3u8')) {
          proxyRes.headers['Content-Type'] = 'application/vnd.apple.mpegurl';
          proxyRes.headers['Cache-Control'] = 'no-cache';
        }
        
        if (req.url && req.url.includes('.ts')) {
          proxyRes.headers['Content-Type'] = 'video/mp2t';
          proxyRes.headers['Cache-Control'] = 'max-age=3600';
        }
        
        // Remover cabeçalhos que podem causar CORB
        delete proxyRes.headers['x-content-type-options'];
        delete proxyRes.headers['x-frame-options'];
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
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        proxyReq.setHeader('Accept', 'application/xml, text/xml, */*');
        proxyReq.setHeader('Origin', 'http://localhost:3000');
        proxyReq.setHeader('Referer', 'http://localhost:3000/');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Adicionar cabeçalhos CORS
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        
        // Configurar tipo de conteúdo para XML
        if (req.url && req.url.includes('xmltv')) {
          proxyRes.headers['Content-Type'] = 'application/xml; charset=utf-8';
        }
      },
    })
  );

};
