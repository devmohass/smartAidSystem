/**
 * Centralized Express error handler.
 *
 * Anything a controller throws (or any rejected promise from an async
 * handler under Express 5) ends up here. Controllers are free to drop
 * their generic try/catch + console.error + 500 boilerplate.
 *
 * Errors that carry their own HTTP status are honored:
 *   throw { http: 409, message: "...", details: {...} }
 * Otherwise the error becomes a logged 500.
 */
export default function errorHandler(err, req, res, next) {
  // If headers were already sent the response stream is past saving;
  // delegate to Express's default handler to abort cleanly.
  if (res.headersSent) return next(err);

  const status = err && (err.http || err.httpStatus);
  if (status) {
    return res.status(status).json({
      error: err.message || "Error",
      ...(err.details ? {details: err.details} : {}),
    });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({error: "Internal server error"});
}
