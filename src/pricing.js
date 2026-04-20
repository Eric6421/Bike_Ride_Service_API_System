/**
 * Defines pricing constants to keep fare logic and easy to adjust.
 */
const PRICING = {
  unlockFee: 5,
  freeMinutes: 15,
  chargedBlockMinutes: 5,
  chargedBlockPrice: 1,
  dailyCap: 25,
};





/**
 * a helper function:
 * Converts a ride duration (in minutes) into usage charge based on pricing rules.
 * @param {number} durationMinutes - Total ride duration in minutes.
 * @returns {number} Usage charge before unlock fee and cap are applied.
 */
function calculateUsageCharge(durationMinutes) {
  if (durationMinutes <= PRICING.freeMinutes) {
    return 0;
  }

  const chargeableMinutes = durationMinutes - PRICING.freeMinutes;
  const blocks = Math.ceil(chargeableMinutes / PRICING.chargedBlockMinutes);
  return blocks * PRICING.chargedBlockPrice;
}





/**
 * helper function:
 * is responsible for calculating the total cost of an entire ride
 * and returning a detailed pricing breakdown.
 * @param {Date} startTime - Ride start timestamp.
 * @param {Date} endTime - Ride end timestamp.
 * @returns {{durationMinutes:number,unlockFee:number,usageCharge:number,total:number,capped:boolean}}
 * Returns fare breakdown and final total.
 */
function calculateRideCost(startTime, endTime) {
  const durationMs = Math.max(endTime.getTime() - startTime.getTime(), 0);
  const durationMinutes = Math.ceil(durationMs / (60 * 1000));
  const usageCharge = calculateUsageCharge(durationMinutes);
  const rawTotal = PRICING.unlockFee + usageCharge;
  const total = Math.min(rawTotal, PRICING.dailyCap);

  return {
    durationMinutes,
    unlockFee: PRICING.unlockFee,
    usageCharge,
    total,
    capped: rawTotal > PRICING.dailyCap,
  };
}




module.exports = {
  PRICING,
  calculateRideCost,
};
