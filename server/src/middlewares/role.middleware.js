import ApiResponse from '../utils/apiResponse.js';

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return ApiResponse.error(res, 'Unauthorized', 401);
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Akses ditolak! Anda tidak memiliki izin.', 403);
    }
    next();
  };
};

export default authorize;