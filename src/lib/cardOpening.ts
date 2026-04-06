const MIN_INITIAL_AMOUNT_BY_CARD_BIN: Record<string, number> = {
  G34584: 1,
};

export function getMinimumInitialAmountForCardBin(cardBin?: string | null): number {
  if (!cardBin) return 0;
  return MIN_INITIAL_AMOUNT_BY_CARD_BIN[cardBin] ?? 0;
}

export function getNormalizedInitialAmount(cardBin: string | null | undefined, initialAmount: number): number {
  return Math.max(initialAmount, getMinimumInitialAmountForCardBin(cardBin));
}

export function getOpenCardPricing(params: {
  cardBin?: string | null;
  openFee: number;
  requestedInitialAmount?: number;
  rechargeFeePercent: number;
}) {
  const initialAmount = getNormalizedInitialAmount(params.cardBin, params.requestedInitialAmount ?? 0);
  const rechargeFee = Math.round(initialAmount * (params.rechargeFeePercent / 100) * 100) / 100;
  const totalCost = Math.round((params.openFee + initialAmount + rechargeFee) * 100) / 100;

  return {
    initialAmount,
    rechargeFee,
    totalCost,
  };
}