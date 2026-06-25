const DEFAULT_USD_TO_CAD_RATE = 1.55;

const parsedRate = Number.parseFloat(import.meta.env.VITE_USD_TO_CAD_RATE);

export const USD_TO_CAD_RATE =
  Number.isFinite(parsedRate) && parsedRate > 0
    ? parsedRate
    : DEFAULT_USD_TO_CAD_RATE;
