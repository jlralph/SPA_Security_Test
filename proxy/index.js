'use strict';
const http = require('node:http');
const net = require('node:net');

const PORT = process.env.PORT || 8080;

function ts() { return new Date().toISOString(); }

function logRequest(method, url, body) {
  console.log(`${ts()} [HTTP] ${method} ${url}`);
  if (body.length > 0) {
    const preview = body.slice(0, 512).toString('utf8');
    console.log(`  body: ${preview}${body.length > 512 ? ' …' : ''}`);
  }
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    logRequest(req.method, req.url, body);

    let target;
    try { target = new URL(req.url); }
    catch {
      res.writeHead(400).end('Bad Request');
      return;
    }

    const options = {
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: req.method,
      headers: { ...req.headers, host: target.host },
    };

    const upstream = http.request(options, (upRes) => {
      console.log(`  -> ${upRes.statusCode} ${target.host}`);
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res);
    });

    upstream.on('error', err => {
      console.error(`  error: ${err.message}`);
      res.writeHead(502).end('Bad Gateway');
    });

    if (body.length) upstream.write(body);
    upstream.end();
  });
});

// CONNECT tunnels — used by undici for both HTTP and HTTPS.
// For port 80 tunnels we buffer the first data chunk to log the request line + headers.
// For port 443 (and everything else) the payload is TLS-encrypted so we log the hostname only.
server.on('connect', (req, clientSock, head) => {
  const [host, portStr] = req.url.split(':');
  const port = parseInt(portStr, 10) || 443;

  const serverSock = net.connect(port, host, () => {
    clientSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');

    if (port === 80) {
      // Plain HTTP through tunnel — intercept client→server data to log request headers
      let buf = head.length ? head : Buffer.alloc(0);
      let logged = false;
      if (head.length) serverSock.write(head);

      clientSock.on('data', chunk => {
        serverSock.write(chunk);
        if (!logged) {
          buf = Buffer.concat([buf, chunk]);
          const str = buf.toString('utf8');
          const end = str.indexOf('\r\n\r\n');
          if (end !== -1) {
            logged = true;
            const [reqLine, ...headers] = str.slice(0, end).split('\r\n');
            console.log(`${ts()} [HTTP via tunnel] ${reqLine} → ${host}`);
            for (const h of headers) console.log(`  ${h}`);
          }
        }
      });
      serverSock.on('data', chunk => clientSock.write(chunk));
    } else {
      console.log(`${ts()} [CONNECT] ${req.url}`);
      if (head.length) serverSock.write(head);
      serverSock.pipe(clientSock);
      clientSock.pipe(serverSock);
    }
  });

  serverSock.on('error', err => {
    console.error(`${ts()} [CONNECT] ${req.url} error: ${err.message}`);
    clientSock.destroy();
  });
  clientSock.on('error', () => serverSock.destroy());
});

server.listen(PORT, () => console.log(`${ts()} [proxy] listening on :${PORT}`));
