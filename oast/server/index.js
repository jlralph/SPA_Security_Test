const Dns2 = require('dns2');
const { Packet } = Dns2;
const http = require('http');

const OAST_IP     = process.env.OAST_IP       || '172.28.0.10';
const OAST_DOMAIN = process.env.OAST_DOMAIN   || 'oast.local';
const UPSTREAM    = process.env.UPSTREAM_DNS  || '8.8.8.8';

const interactions = [];
let seq = 0;

function record(type, data) {
  const entry = { id: ++seq, type, ts: new Date().toISOString(), ...data };
  interactions.push(entry);
  console.log(`[${type}] ${JSON.stringify(data)}`);
}

// ── DNS server ────────────────────────────────────────────────────────────────

const upstreamClient = new Dns2({ dns: UPSTREAM });

const dnsServer = Dns2.createServer({
  udp: true,
  tcp: true,
  handle: async (request, send, rinfo) => {
    const response = Packet.createResponseFromRequest(request);
    response.header.qr  = 1;
    response.header.aa  = 1;
    response.header.ra  = 1;

    for (const q of request.questions) {
      const name = q.name.toLowerCase();
      const isOast = name === OAST_DOMAIN || name.endsWith('.' + OAST_DOMAIN);

      if (isOast) {
        record('DNS', { query: q.name, from: rinfo?.address || 'unknown', qtype: q.type });
        if (q.type === Packet.TYPE.A) {
          response.answers.push({
            name: q.name,
            type: Packet.TYPE.A,
            class: Packet.CLASS.IN,
            ttl: 1,
            address: OAST_IP,
          });
        }
        // non-A types for oast.local get no answer (empty NOERROR)
      } else {
        // Forward everything else upstream
        try {
          const typeStr = Object.keys(Packet.TYPE).find(k => Packet.TYPE[k] === q.type) || 'A';
          const upstream = await upstreamClient.resolve(q.name, typeStr);
          for (const ans of upstream.answers) response.answers.push(ans);
        } catch (_) {
          // upstream failure → SERVFAIL
          response.header.rcode = 2;
        }
      }
    }

    send(response);
  },
});

dnsServer.on('error', err => console.error('[DNS ERROR]', err.message));
dnsServer.listen({ udp: 53, tcp: 53 });
console.log(`[DNS] :53  resolving *.${OAST_DOMAIN} → ${OAST_IP}, forwarding rest to ${UPSTREAM}`);

// ── HTTP interaction capture (port 80) ────────────────────────────────────────

const captureServer = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8').slice(0, 500);
    record('HTTP', {
      method: req.method,
      host:   req.headers.host || '',
      url:    req.url,
      body:   body || undefined,
    });
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });
});

captureServer.listen(80);
console.log('[HTTP] :80  capturing incoming HTTP callbacks');

// ── Web UI + interactions API (port 8080) ─────────────────────────────────────

const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OAST Interactions</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:monospace;background:#1a1a2e;color:#eee;padding:24px}
    h1{color:#e94560;margin-bottom:16px}
    .toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    button{background:#e94560;color:#fff;border:none;padding:6px 14px;cursor:pointer;font-family:inherit}
    button:hover{background:#c0304d}
    #count{color:#aaa;font-size:0.85em}
    #live{color:#4fc3f7;font-size:0.8em}
    table{width:100%;border-collapse:collapse}
    th{background:#16213e;padding:8px;text-align:left;color:#e94560;font-size:0.8em;text-transform:uppercase;letter-spacing:1px}
    td{padding:8px;border-bottom:1px solid #222;font-size:0.82em;vertical-align:top;word-break:break-all}
    .DNS{color:#4fc3f7}.HTTP{color:#81c784}
    .empty{color:#555;padding:20px;text-align:center}
  </style>
</head>
<body>
  <h1>OAST Interaction Log</h1>
  <div class="toolbar">
    <button onclick="clearAll()">Clear</button>
    <span id="count">–</span>
    <span id="live">● live</span>
  </div>
  <table>
    <thead><tr><th>#</th><th>Type</th><th>Time</th><th>Details</th></tr></thead>
    <tbody id="body"></tbody>
  </table>
  <script>
    async function load(){
      try{
        const r=await fetch('/api/interactions');
        const data=await r.json();
        document.getElementById('count').textContent=data.length+' interaction'+(data.length===1?'':'s');
        const rows=[...data].reverse().map(i=>'<tr><td>'+i.id+'</td><td class="'+i.type+'">'+i.type+'</td><td>'+i.ts+'</td><td>'+detail(i)+'</td></tr>').join('');
        document.getElementById('body').innerHTML=rows||'<tr><td colspan="4" class="empty">No interactions yet. Send a payload to trigger one.</td></tr>';
        document.getElementById('live').style.color='#81c784';
      }catch(e){document.getElementById('live').style.color='#e94560';}
    }
    function detail(i){
      if(i.type==='DNS') return 'query: '+i.query+' &nbsp;|&nbsp; from: '+i.from;
      if(i.type==='HTTP') return i.method+' '+i.host+i.url+(i.body?'<br><small>body: '+esc(i.body)+'</small>':'');
      return esc(JSON.stringify(i));
    }
    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    async function clearAll(){await fetch('/api/clear',{method:'POST'});load();}
    load();
    setInterval(load,2000);
  </script>
</body>
</html>`;

const uiServer = http.createServer((req, res) => {
  if (req.url === '/api/interactions') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(interactions));
    return;
  }

  if (req.url === '/api/clear' && req.method === 'POST') {
    interactions.length = 0;
    seq = 0;
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve web UI for everything else
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(UI_HTML);
});

uiServer.listen(8080);
console.log('[UI]  :8080 interaction log at http://localhost:8080');
