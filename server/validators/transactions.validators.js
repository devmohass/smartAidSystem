import Joi from "joi";

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
