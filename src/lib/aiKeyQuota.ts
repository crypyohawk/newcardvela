export function getAvailableTokenUsd(params: {
  aiBalance: number;
  creditLimit: number;
  monthUsed: number;
  monthlyLimit: number | null | undefined;
}) {
  const balanceAllowance = Math.max(params.aiBalance + params.creditLimit, 0);
  const monthlyRemaining = params.monthlyLimit == null
    ? Number.POSITIVE_INFINITY
    : Math.max(params.monthlyLimit - params.monthUsed, 0);

  return Math.max(0, Math.min(balanceAllowance, monthlyRemaining));
}

export function isAiKeyQuotaExhausted(params: {
  aiBalance: number;
  creditLimit: number;
  monthUsed: number;
  monthlyLimit: number | null | undefined;
}) {
  return getAvailableTokenUsd(params) <= 0;
}