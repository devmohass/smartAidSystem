import Joi from "joi";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export const auditLogsQuerySchema = Joi.object({
  user_id: Joi.number().integer().positive().optional().messages({
    "number.base": "user_id must be a positive integer",
    "number.integer": "user_id must be a positive integer",
    "number.positive": "user_id must be a positive integer",
  }),
  action: Joi.string().trim().min(1).optional(),
  entity_type: Joi.string().trim().min(1).optional(),
  entity_id: Joi.number().integer().positive().optional().messages({
    "number.base": "entity_id must be a positive integer",
    "number.integer": "entity_id must be a positive integer",
    "number.positive": "entity_id must be a positive integer",
  }),
  from: Joi.date().iso().optional().messages({
    "date.base": "from must be a valid date",
    "date.format": "from must be a valid date",
  }),
  to: Joi.date().iso().optional().messages({
    "date.base": "to must be a valid date",
    "date.format": "to must be a valid date",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .messages({
      "number.base": "limit must be a positive integer",
      "number.integer": "limit must be a positive integer",
      "number.min": "limit must be a positive integer",
    }),
  offset: Joi.number().integer().min(0).default(0).messages({
    "number.base": "offset must be a non-negative integer",
    "number.integer": "offset must be a non-negative integer",
    "number.min": "offset must be a non-negative integer",
  }),
});
