import Joi from "joi";

export const listQuerySchema = Joi.object({
  q: Joi.string().trim().allow("").optional(),
  limit: Joi.number().integer().min(1).max(500).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

export const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "any.required": "Invalid beneficiary id",
    "number.base": "Invalid beneficiary id",
    "number.integer": "Invalid beneficiary id",
    "number.positive": "Invalid beneficiary id",
  }),
});

export const searchQuerySchema = Joi.object({
  phone: Joi.string().trim().min(1),
  qr_code: Joi.string().trim().min(1),
})
  .xor("phone", "qr_code")
  .messages({
    "object.missing": "Provide ?phone= or ?qr_code=",
    "object.xor": "Provide only one of ?phone= or ?qr_code=",
  });

export const createBeneficiarySchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    "any.required": "name is required",
    "string.empty": "name is required",
  }),
  phone_number: Joi.string().trim().min(1).required().messages({
    "any.required": "phone_number is required",
    "string.empty": "phone_number is required",
  }),
  profile_image_url: Joi.string().trim().allow(null, "").optional(),
  family_size: Joi.number().integer().min(1).optional().messages({
    "number.base": "family_size must be a positive integer",
    "number.integer": "family_size must be a positive integer",
    "number.min": "family_size must be a positive integer",
  }),
  location: Joi.string().trim().allow(null, "").optional(),
});

export const updateBeneficiarySchema = Joi.object({
  name: Joi.string().trim().min(1).messages({
    "string.empty": "name must be a non-empty string",
  }),
  phone_number: Joi.string().trim().min(1).messages({
    "string.empty": "phone_number must be a non-empty string",
  }),
  profile_image_url: Joi.string().trim().allow(null, "").optional(),
  family_size: Joi.number().integer().min(1).messages({
    "number.base": "family_size must be a positive integer",
    "number.integer": "family_size must be a positive integer",
    "number.min": "family_size must be a positive integer",
  }),
  location: Joi.string().trim().allow(null, "").optional(),
})
  .min(1)
  .messages({
    "object.min": "Provide at least one field (name, phone_number, profile_image_url, family_size, location)",
  });
