const ApiResponse = require('../utils/apiResponse');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        'Anda tidak memiliki akses untuk ini',
        403
      );
    }

    next();
  };
};

module.exports = authorize;