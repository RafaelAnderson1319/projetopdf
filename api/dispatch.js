const handleRequest = require('../server.cjs');

module.exports = (req, res) => {
  const incoming = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = incoming.searchParams.get('__path') || '/';
  incoming.searchParams.delete('__path');
  const query = incoming.searchParams.toString();
  req.url = path + (query ? `?${query}` : '');
  return handleRequest(req, res);
};
