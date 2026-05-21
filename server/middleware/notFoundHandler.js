/**
 * JSON 404 for unknown routes. Without this, Express returns an HTML
 * page for `/api/whatever-doesnt-exist`, which is unhelpful for an API
 * client that expects JSON.
 */
export default function notFoundHandler(req, res) {
  return res.status(404).json({error: `Route not found: ${req.method} ${req.originalUrl}`});
}
