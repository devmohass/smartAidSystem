/**
 * Joi validation middleware.
 *
 *   validate("body",   schema)
 *   validate("query",  schema)
 *   validate("params", schema)
 *
 * On success: replaces req[source] with the coerced/stripped value so
 * controllers can trust the input (e.g. req.params.id is a real number,
 * unknown body keys are dropped).
 *
 * On failure: 400 { error: "<first message>", details: [{path, message}, ...] }
 */
export default function validate(source, schema) {
  return (req, res, next) => {
    const {error, value} = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        error: error.details[0].message,
        details: error.details.map((d) => ({
          path: d.path.join("."),
          message: d.message,
        })),
      });
    }

    req[source] = value;
    return next();
  };
}
