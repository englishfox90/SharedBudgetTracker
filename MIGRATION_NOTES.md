# Migration to Ratio-Based Contribution Model

## Overview
The application has been updated from a percentage-based contribution model to a ratio-based contribution model that automatically calculates contributions based on annual salaries and forecasted expenses.

## Key Changes

### 1. Database Schema Updates (`prisma/schema.prisma`)

**Account Model:**
- Added `defaultPayFrequency` (String, default: "semi_monthly")
- Added `inflationRate` (Float, default: 3.0)
- Added `autoCalculateContrib` (Boolean, default: false)

**IncomeRule Model:**
- Changed from `monthlyGross` to `annualSalary` (Float)
- Changed from `contributionPercent` to `contributionAmount` (Float)
- Both fields now represent actual dollar amounts

### 2. New Features

**Automatic Contribution Calculation:**
- Analyzes historical transactions to calculate annual expenses
- Projects future expenses with inflation adjustment
- Calculates proportional contributions based on salary ratios
- Updates contribution amounts for all income sources

**Flexible Pay Schedules:**
- Monthly
- Semi-monthly (2x per month)
- Bi-weekly (every 2 weeks)
- Weekly

**New API Endpoint:**
- `GET /api/contributions?accountId=X` - Get contribution summary
- `POST /api/contributions?accountId=X` - Auto-calculate and update contributions

### 3. Updated Components

**SetupTab.tsx:**
- Account settings now include inflation rate input
- "Calculate Contributions" button for auto-calculation
- Income rule cards show annual salary and contribution amount
- AddIncomeDialog accepts annual salary instead of monthly gross
- Pay frequency selector added to income dialog
- Removed contribution percentage inputs

**RecommendationTab.tsx:**
- Complete redesign of recommendation display
- Shows current vs recommended total annual contributions
- Per-person breakdown table with:
  - Name
  - Annual salary
  - Pay frequency
  - Current contribution per period
  - Recommended contribution per period
- Updated "Apply" button to set individual contribution amounts

**ForecastTab.tsx:**
- No changes needed - works with new contribution amounts

### 4. Updated Business Logic

**lib/contributions.ts (NEW):**
- `calculateAnnualExpenses()` - Sum historical withdrawals
- `calculateForecastedExpenses()` - Project with inflation
- `calculateProportionalContributions()` - Ratio-based calculation
- `updateContributionAmounts()` - Persist to database
- `getContributionSummary()` - Detailed breakdown for UI

**lib/recommendation.ts:**
- Rewritten to return annual totals instead of percentages
- Returns per-person breakdown with recommended amounts
- Tests recommendations by temporarily updating database

**lib/forecast.ts:**
- Updated to use `contributionAmount` directly
- Removed percentage-based calculations

### 5. Updated API Routes

**app/api/income-rules/route.ts:**
- POST accepts `annualSalary` and `contributionAmount`
- Removed `monthlyGross` and `contributionPercent`

**app/api/income-rules/[id]/route.ts:**
- PATCH accepts `annualSalary` and `contributionAmount`
- Removed old field handlers

**app/api/accounts/[id]/route.ts:**
- PATCH accepts new Account fields (inflationRate, etc.)

### 6. Type Updates (`types/index.ts`)

**Account Interface:**
```typescript
{
  defaultPayFrequency: string;
  inflationRate: number;
  autoCalculateContrib: boolean;
}
```

**IncomeRule Interface:**
```typescript
{
  annualSalary: number;       // was: monthlyGross
  contributionAmount: number; // was: contributionPercent
  payFrequency: string;       // now editable
}
```

**RecommendationResult Interface:**
```typescript
{
  currentTotalAnnualContribution: number;
  recommendedTotalAnnualContribution: number;
  contributionBreakdown: Array<{
    incomeRuleId: number;
    name: string;
    annualSalary: number;
    currentContributionPerPeriod: number;
    recommendedContributionPerPeriod: number;
    payFrequency: string;
  }>;
}
```

## How to Use the New System

### Initial Setup
1. Go to Setup tab
2. Add income sources with annual salaries
3. Leave "Contribution Per Pay Period" blank initially
4. Set your inflation rate in Account Settings
5. Click "Calculate Contributions" button
6. System will analyze expenses and set proportional contributions

### Getting Recommendations
1. Go to Recommendation tab
2. View current vs recommended annual totals
3. See per-person breakdown of contributions
4. Click "Apply This Recommendation" to update

### Understanding the Calculation
- System looks at last 12 months of expenses
- Projects forward with inflation rate
- Calculates total needed annual contributions
- Splits contributions by salary ratio (higher earners contribute proportionally more)
- Ensures balance stays above safe minimum

## Example

**Two People:**
- Paul: $72,000/year salary
- Jameson: $66,000/year salary
- Total: $138,000

**Annual Expenses:** $36,000
**Inflation Rate:** 3%
**Projected Next Year:** $37,080

**Contribution Ratio:**
- Paul: 72/138 = 52.17%
- Jameson: 66/138 = 47.83%

**Contribution Amounts (Semi-Monthly):**
- Paul: $37,080 × 0.5217 ÷ 24 = $805.26 per paycheck
- Jameson: $37,080 × 0.4783 ÷ 24 = $738.74 per paycheck

## Migration Steps (if you have existing data)

1. Stop the dev server
2. Run `npm run db:generate` to update Prisma client
3. Run `npm run db:seed` to reset with new schema
4. Restart dev server with `npm run dev`
5. Re-import any CSV transaction data
6. Click "Calculate Contributions" to set initial amounts

## Technical Notes

- Database file: `prisma/dev.db`
- Prisma Client must be regenerated after schema changes
- Pay periods per year: Monthly=12, Semi-monthly=24, Bi-weekly=26, Weekly=52
- All dollar amounts rounded to 2 decimal places
- Recommendations include 10% buffer above calculated minimum
