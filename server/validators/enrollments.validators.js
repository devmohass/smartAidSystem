import Joi from "joi";

// Mounted under /api/campaigns/:id/beneficiaries[/:bid] so the URL
// has both campaign id (`:id`) and beneficiary id (`:bid`).

export const campaignIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid campaign id",
    "number.base": "Invalid campaign id",
    "number.integer": "Invalid campaign id",
    "number.positive": "Invalid campaign id",
  }),
});

export const campaignIdAndBidParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid id",
    "number.base": "Invalid id",
    "number.integer": "Invalid id",
    "number.positive": "Invalid id",
  }),
  bid: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid id",
    "number.base": "Invalid id",
    "number.integer": "Invalid id",
    "number.positive": "Invalid id",
  }),
});

export const enrollSchema = Joi.object({
  beneficiary_id: Joi.number().integer().positive().required().messages({
    "any.required": "beneficiary_id is required and must be a positive integer",
    "number.base": "beneficiary_id is required and must be a positive integer",
    "number.integer": "beneficiary_id is required and must be a positive integer",
    "number.positive": "beneficiary_id is required and must be a positive integer",
  }),
  allocated_balance: Joi.number().positive().required().messages({
    "any.required": "allocated_balance must be a positive number",
    "number.base": "allocated_balance must be a positive number",
    "number.positive": "allocated_balance must be a positive number",
  }),
});

export const updateAllocationSchema = Joi.object({
  allocated_balance: Joi.number().positive().required().messages({
    "any.required": "allocated_balance must be a positive number",
    "number.base": "allocated_balance must be a positive number",
    "number.positive": "allocated_balance must be a positive number",
  }),
});
