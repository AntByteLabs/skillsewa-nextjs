export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME ?? "SkillSewa",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
  business: {
    connectionFee: parseFloat(process.env.CONNECTION_FEE ?? "10"),
    commissionRate: parseFloat(process.env.SERVICE_COMMISSION_RATE ?? "0.10"),
    platformShareRate: parseFloat(process.env.PLATFORM_SHARE_RATE ?? "0.05"),
    workerBonusShareRate: parseFloat(process.env.WORKER_BONUS_SHARE_RATE ?? "0.05"),
    supplierReferralRate: parseFloat(process.env.SUPPLIER_REFERRAL_RATE ?? "0.02"),
    // 30% of the platform's 5% share goes to the referring professional (= 1.5% of finalPrice)
    professionalReferralRate: parseFloat(process.env.PROFESSIONAL_REFERRAL_RATE ?? "0.30"),
    minWithdrawalAmount: parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT ?? "500"),
    workerSearchRadiusKm: parseFloat(process.env.WORKER_SEARCH_RADIUS_KM ?? "5"),
  },
  walletUnlock: {
    minJobsCompleted: 10,
    minRating: 4.0,
    minLoyaltyMonths: 3,
    emergencyUnlockFee: 0.05, // 5% fee for emergency withdrawal
  },
  grade: {
    thresholds: {
      BRONZE: { jobs: 0, rating: 0 },
      SILVER: { jobs: 20, rating: 3.5 },
      GOLD: { jobs: 50, rating: 4.0 },
      PLATINUM: { jobs: 100, rating: 4.5 },
      ELITE: { jobs: 200, rating: 4.8 },
    },
  },
} as const;
