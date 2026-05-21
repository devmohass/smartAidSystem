import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "email and password are required",
    "string.empty": "email and password are required",
    "string.email": "Invalid email format",
  }),
  password: Joi.string().min(1).required().messages({
    "any.required": "email and password are required",
    "string.empty": "email and password are required",
  }),
});
