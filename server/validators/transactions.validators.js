import Joi from "joi";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export const listQuerySchema = Joi.object({
  campaign_id: Joi.number().integer().positive().optional(),
  shop_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid("completed", "failed").optional(),
  q: Joi.string().trim().allow("").optional(),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: Joi.number().integer().min(0).default(0),
});

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid transaction id",
    "number.base": "Invalid transaction id",
    "number.integer": "Invalid transaction id",
    "number.positive": "Invalid transaction id",
  }),
});

export const processTransactionSchema = Joi.object({
  campaign_id: Joi.number().integer().positive().required().messages({
    "any.required": "campaign_id is required and must be a positive integer",
    "number.base": "campaign_id is required and must be a positive integer",
    "number.integer": "campaign_id is required and must be a positive integer",
    "number.positive": "campaign_id is required and must be a positive integer",
  }),
  beneficiary_id: Joi.number().integer().positive().required().messages({
    "any.required": "beneficiary_id is required and must be a positive integer",
    "number.base": "beneficiary_id is required and must be a positive integer",
    "number.integer": "beneficiary_id is required and must be a positive integer",
    "number.positive": "beneficiary_id is required and must be a positive integer",
  }),
  shop_id: Joi.number().integer().positive().required().messages({
    "any.required": "shop_id is required and must be a positive integer",
    "number.base": "shop_id is required and must be a positive integer",
    "number.integer": "shop_id is required and must be a positive integer",
    "number.positive": "shop_id is required and must be a positive integer",
  }),
  amount: Joi.number().positive().required().messages({
    "any.required": "amount is required and must be a positive number",
    "number.base": "amount is required and must be a positive number",
    "number.positive": "amount is required and must be a positive number",
  }),
  goods_description: Joi.string().trim().allow(null, "").optional(),
});
