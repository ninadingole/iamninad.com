// Per-build identifier used to version the service-worker cache.
// Each `npm run build` produces a fresh id; the old SW cache is then
// dropped on activate so users pick up new content on first reload.
module.exports = () => ({
  id: process.env.BUILD_ID || String(Date.now()),
});
