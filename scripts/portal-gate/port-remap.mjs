// Gate tooling (preload): move the disposable fixture API from 4106 to 4206 so fault-proxy.mjs can own 4106.
import http from 'node:http';
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (port, ...rest) {
  return listen.call(this, port === 4106 ? 4206 : port, ...rest);
};
