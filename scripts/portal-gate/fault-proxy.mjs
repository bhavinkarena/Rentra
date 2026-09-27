// Gate tooling: a proxy on 4106 -> the fixture on 4206. GET /__fault/set?re=<regex>&mode=fail|drop; drop forwards, then loses the response.
import http from 'node:http';
let pattern = null,
  mode = 'fail';
const forward = (req, res, onResponse) => {
  const up = http.request(
    { host: '127.0.0.1', port: 4206, path: req.url, method: req.method, headers: req.headers },
    onResponse,
  );
  up.on('error', () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(up);
};
http
  .createServer((req, res) => {
    if (req.url.startsWith('/__fault/set')) {
      const q = new URL(req.url, 'http://x').searchParams;
      pattern = q.get('re') ? new RegExp(q.get('re')) : null;
      mode = q.get('mode') || 'fail';
      res.end(`${pattern} ${mode}`);
      return;
    }
    const lose = () => {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          statusCode: 503,
          success: false,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service unavailable.',
        }),
      );
    };
    if (pattern && pattern.test(req.url)) {
      if (mode === 'fail') {
        req.resume();
        return lose();
      }
      return forward(req, res, (r) => {
        r.resume();
        r.on('end', lose);
      });
    }
    forward(req, res, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
  })
  .listen(4106, () => console.log('fault proxy on 4106'));
