export const calculateRefundAmount = (
  rule: {
    refundPercentage: number
    fareType?: 'total_fare' | 'base_fare' | string
  },
  baseFare: number,
  gstAmount: number,
  gstApplicable: boolean
): number => {
  if (rule.refundPercentage === 0) return 0

  const applicableFare =
    gstApplicable && rule.fareType === 'base_fare'
      ? baseFare                   // base_fare: ignore GST
      : baseFare + gstAmount       // total_fare: include GST

  return Math.round((rule.refundPercentage / 100) * applicableFare)
}

export const getFareTypeLabel = (
  fareType: string | undefined,
  gstApplicable: boolean,
  refundPercentage: number
): string | null => {
  if (!gstApplicable || refundPercentage === 0) return null
  return fareType === 'base_fare'
    ? '(Base only, GST forfeited)'
    : '(Base + GST)'
}
