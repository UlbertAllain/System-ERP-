import { AppError } from "@/lib/errors/app-error";

const MONEY_SCALE = 100;
const MAX_SAFE_MONEY_MINOR_UNITS = Number.MAX_SAFE_INTEGER;

export function toMoneyMinorUnits(value: number): number {
  if (!Number.isFinite(value)) {
    throw new AppError("Nominal uang tidak valid.", 400, "INVALID_MONEY");
  }

  const sign = value < 0 ? -1 : 1;
  const minorUnits =
    Math.round((Math.abs(value) + Number.EPSILON) * MONEY_SCALE) * sign;

  if (Math.abs(minorUnits) > MAX_SAFE_MONEY_MINOR_UNITS) {
    throw new AppError(
      "Nominal uang melebihi batas yang didukung sistem.",
      400,
      "MONEY_OUT_OF_RANGE",
    );
  }

  return minorUnits;
}

export function fromMoneyMinorUnits(minorUnits: number): number {
  return minorUnits / MONEY_SCALE;
}

export function normalizeMoney(value: number): number {
  return fromMoneyMinorUnits(toMoneyMinorUnits(value));
}

export function addMoney(...values: number[]): number {
  return fromMoneyMinorUnits(
    values.reduce((total, value) => total + toMoneyMinorUnits(value), 0),
  );
}

export function subtractMoney(minuend: number, subtrahend: number): number {
  return fromMoneyMinorUnits(
    toMoneyMinorUnits(minuend) - toMoneyMinorUnits(subtrahend),
  );
}

export function compareMoney(left: number, right: number): number {
  return toMoneyMinorUnits(left) - toMoneyMinorUnits(right);
}
