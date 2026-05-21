import Joi from "joi";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export const reportTransactionsQuerySchema = Joi.object({
  campaign_id: Joi.number().integer().positive().optional().messages({
    "number.base": "campaign_id must be a positive integer",
    "number.integer": "campaign_id must be a positive integer",
    "number.positive": "campaign_id must be a positive integer",
  }),
  beneficiary_id: Joi.number().integer().positive().optional().messages({
    "number.base": "beneficiary_id must be a positive integer",
    "number.integer": "beneficiary_id must be a positive integer",
    "number.positive": "beneficiary_id must be a positive integer",
  }),
  shop_id: Joi.number().integer().positive().optional().messages({
    "number.base": "shop_id must be a positive integer",
    "number.integer": "shop_id must be a positive integer",
    "number.positive": "shop_id must be a positive integer",
  }),
  shop_manager_id: Joi.number().integer().positive().optional().messages({
    "number.base": "shop_manager_id must be a positive integer",
    "number.integer": "shop_manager_id must be a positive integer",
    "number.positive": "shop_manager_id must be a positive integer",
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
