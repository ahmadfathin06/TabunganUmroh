const ApiResponse = require('../utils/apiResponse');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return ApiResponse.error(res, 'Validasi gagal', 422, errors);
      }

      req.validatedData = result.data;
      next();
    } catch (error) {
      return ApiResponse.error(res, 'Validation error', 422);
    }
  };
};

module.exports = validate;