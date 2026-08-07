/**
 * Enterprise standard JSON response serializers
 */

export function sendSuccess(res, data = {}, message = 'Operation successful', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
}

export function sendError(res, message = 'Internal Server Error', statusCode = 500, errorDetails = null) {
  const payload = {
    success: false,
    error: message
  };
  if (errorDetails) {
    payload.details = errorDetails;
  }
  return res.status(statusCode).json(payload);
}

export default {
  sendSuccess,
  sendError
};
