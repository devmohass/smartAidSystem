import Joi from "joi";

const ALLOWED_ROLES = ["admin", "shop_manager", "donor"];

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid user id",
    "number.base": "Invalid user id",
    "number.integer": "Invalid user id",
    "number.positive": "Invalid user id",
  }),
});

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    "any.required": "name is required",
    "string.empty": "name must be a non-empty string",
    "string.base": "name must be a string",
  }),
  email: Joi.string().email().required().messages({
    "any.required": "email is required",
    "string.empty": "email is required",
    "string.email": "Invalid email format",
  }),
  password: Joi.string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
    .required()
    .messages({
      "any.required": "password is required",
      "string.empty": "password is required",
      "string.pattern.base": "password must be at least 8 characters and include a letter and a number",
    }),
  role: Joi.string()
    .valid(...ALLOWED_ROLES)
    .required()
    .messages({
      "any.required": "role is required",
      "string.empty": "role is required",
      "any.only": `role must be one of: ${ALLOWED_ROLES.join(", ")}`,
    }),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(1).messages({
    "string.empty": "name must be a non-empty string",
  }),
  email: Joi.string().email().messages({
    "string.empty": "email must be a non-empty string",
    "string.email": "Invalid email format",
  }),
})
  .min(1)
  .messages({
    "object.min": "Provide at least one field to update (name, email)",
  });
