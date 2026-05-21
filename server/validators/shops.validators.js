import Joi from "joi";

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid shop id",
    "number.base": "Invalid shop id",
    "number.integer": "Invalid shop id",
    "number.positive": "Invalid shop id",
  }),
});

export const idAndUserIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid id",
    "number.base": "Invalid id",
    "number.integer": "Invalid id",
    "number.positive": "Invalid id",
  }),
  userId: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid id",
    "number.base": "Invalid id",
    "number.integer": "Invalid id",
    "number.positive": "Invalid id",
  }),
});

export const createShopSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    "any.required": "name is required",
    "string.empty": "name is required",
    "string.base": "name must be a string",
  }),
  location: Joi.string().trim().allow(null, "").optional(),
  owner_name: Joi.string().trim().allow(null, "").optional(),
});

export const updateShopSchema = Joi.object({
  name: Joi.string().trim().min(1).messages({
    "string.empty": "name must be a non-empty string",
  }),
  location: Joi.string().trim().allow(null, "").optional(),
  owner_name: Joi.string().trim().allow(null, "").optional(),
})
  .min(1)
  .messages({
    "object.min": "Provide at least one field to update (name, location, owner_name)",
  });

export const assignShopManagerSchema = Joi.object({
  user_id: Joi.number().integer().positive().required().messages({
    "any.required": "user_id is required and must be a positive integer",
    "number.base": "user_id is required and must be a positive integer",
    "number.integer": "user_id is required and must be a positive integer",
    "number.positive": "user_id is required and must be a positive integer",
  }),
});
