/**
 * SmartAid response envelope.
 *
 * Success:  ok(res, data)         -> 200 { data: <thing> }
 *           ok(res, data, 201)    -> 201 { data: <thing> }
 * Paginated list endpoints add sibling keys after data:
 *           res.status(200).json({ data: [...], pagination, filters })
 *
 * Errors are produced directly:
 *           res.status(4xx).json({ error: "...", details? })
 * never via ok(). The centralized errorHandler also emits { error }
 * for uncaught 500s.
 */
export function ok(res, data, status = 200) {
  return res.status(status).json({data});
}
