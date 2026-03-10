const MIN_INVESTMENT = 5000;
const MAX_INVESTMENT = 500000;

export const MODEL_DEFAULTS = {
  minInvestment: MIN_INVESTMENT,
  maxInvestment: MAX_INVESTMENT,
  carry: 0.20,
  safeCap: 25000000,
  seriesARaise: 35000000,
  seriesAPreMoney: 100000000,
  optionPool: 15,
  exitYear: 2029,
};

export function clampInvestment(value) {
  if (!value) return MIN_INVESTMENT;
  return Math.min(MAX_INVESTMENT, Math.max(MIN_INVESTMENT, value));
}

export function calcSeedOwnership(amount, safeCap = MODEL_DEFAULTS.safeCap) {
  return amount / safeCap;
}

export function calcSeriesAPostMoney(seriesAPreMoney, seriesARaise) {
  return seriesAPreMoney + seriesARaise;
}

export function calcNewInvestorDilution(seriesARaise, seriesAPostMoney) {
  return seriesARaise / seriesAPostMoney;
}

export function calcDilutionFactor(newInvestorDilution, optionPoolPct) {
  return 1 - newInvestorDilution - (optionPoolPct / 100);
}

export function calcPostSeriesAOwnership(seedOwnership, dilutionFactor) {
  return seedOwnership * Math.max(0, dilutionFactor);
}

export function calcNetAfterCarry(gross, amount, carry = MODEL_DEFAULTS.carry) {
  const profit = gross - amount;
  if (profit <= 0) return gross;
  return amount + (profit * (1 - carry));
}

export function calcMOIC(net, amount) {
  return net / amount;
}

export function fmtDollarShort(value) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e8) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function fmtFull(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

export function fmtPct(value) {
  return `${(value * 100).toFixed(2)}%`;
}
