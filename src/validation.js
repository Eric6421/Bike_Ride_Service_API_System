/**
 * helper function:
 * used for POST /ride/start.
 * 1. Check if the body is a JSON object
 *    Ensures that the request body is a valid object, not null, a string, or empty.
 * 2. validate If elapsedMinutes is provided, it must be a non‑negative integer
 * 3. validate If rideId is provided, it must be a positive integer
 * @param {object} body - Request body from client.
 * @returns {{ok:boolean,error?:string}} Validation result.
 */
function validateStartRidePayload(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  /**
   * elapsedMinutes is optional and only used for testing.
   * When provided, it must be a non-negative integer.
   */
  if (
    body.elapsedMinutes !== undefined &&
    (!Number.isInteger(body.elapsedMinutes) || body.elapsedMinutes < 0)
  ) {
    return {
      ok: false,
      error: "elapsedMinutes must be a non-negative integer when provided.",
    };
  }

  /**
   * rideId is optional for tester-driven ID assignment.
   * When provided, it must be a positive integer.
   */
  if (body.rideId !== undefined && (!Number.isInteger(body.rideId) || body.rideId <= 0)) {
    return {
      ok: false,
      error: "rideId must be a positive integer when provided.",
    };
  }

  return { ok: true };
}






/**
 * helper function:
 * verify whether the request body is valid
 * 1. Check if the body is a JSON object
 *    If it’s not a valid object (for example, null, a string, or empty)
 * 2. and rideId is required and must be a positive integer (> 0).
 * @param {object} body - Request body from client.
 * @returns {{ok:boolean,error?:string}} Validation result.
 */
function validateEndRidePayload(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (!Number.isInteger(body.rideId) || body.rideId <= 0) {
    return { ok: false, error: "rideId is required and must be a positive integer." };
  }

  return { ok: true };
}






/**
 * To convert and validate the :id value 
 * Convert the string to an integer
 * then , Checks whether the parsed value is a positive integer (> 0).
 * @param {string} id - Raw route parameter.
 * @returns {{ok:boolean,value?:number,error?:string}} Parse result.
 */
function parseRideId(id) {
  const parsed = Number.parseInt(id, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: "Ride id must be a positive integer." };
  }

  return { ok: true, value: parsed };
}




module.exports = {
  validateStartRidePayload,
  validateEndRidePayload,
  parseRideId,
};
