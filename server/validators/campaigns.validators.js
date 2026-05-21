import Joi from "joi";

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid campaign id",
    "number.base": "Invalid campaign id",
    "number.integer": "Invalid campaign id",
    "number.positive": "Invalid campaign id",
  }),
});

export const createCampaignSchema = Joi.object({
  title: Joi.string().trim().min(1).required().messages({
    "any.required": "title is required",
    "string.empty": "title is required",
  }),
  location: Joi.string().trim().allow(null, "").optional(),
  start_date: Joi.date().iso().required().messages({
    "any.required": "start_date is required and must be a valid date",
    "date.base": "start_date is required and must be a valid date",
    "date.format": "start_date is required and must be a valid date",
  }),
  end_date: Joi.date()
    .iso()
    .min(Joi.ref("start_date"))
    .required()
    .messages({
      "any.required": "end_date is required and must be a valid date",
      "date.base": "end_date is required and must be a valid date",
      "date.format": "end_date is required and must be a valid date",
      "date.min": "end_date must be on or after start_date",
    }),
  budget: Joi.number().positive().required().messages({
    "any.required": "budget is required and must be a positive number",
    "number.base": "budget is required and must be a positive number",
    "number.positive": "budget is required and must be a positive number",
  }),
});

export const changeStatusSchema = Joi.object({
  status: Joi.string().valid("active", "closed").required().messages({
    "any.required": "status must be 'active' or 'closed'",
    "any.only": "status must be 'active' or 'closed'",
    "string.empty": "status must be 'active' or 'closed'",
  }),
});
