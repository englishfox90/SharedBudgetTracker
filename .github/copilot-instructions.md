# Copilot Instructions for Shared Balance Planner

## Project Overview

Full-stack TypeScript app for forecasting daily balances in a shared checking account. Uses historical transaction analysis with inflation adjustment, seasonality detection, and trend analysis to predict variable expenses and recommend optimal contribution percentages.

## Technology Stack

- **Next.js 16** (App Router) + **TypeScript** (strict mode) + **React 19**
- **PostgreSQL** via **Prisma 5.x** (⚠️ NOT 7.x - breaking changes)
- **Radix UI** for all interactive components
- **date-fns** for date operations
- **Inline React.CSSProperties** for styling (no CSS-in-JS)
- **Space Grotesk** font (Google Fonts)

## Architecture: Core Data Flow

### 1. Three-Layer Forecasting System

**Base Layer** (`lib/forecast.ts`):
- Generates day-by-day cash events for a single month
- Combines: income deposits + fixed expenses + variable expense estimates
- Returns: `ForecastResult` with daily balances and alerts

**Variable Expense Engine** (`lib/variable-expenses-advanced.ts`):
- **NOT** a simple average—uses 4-component model:
  1. **Inflation adjustment**: Normalizes historical data to target month's dollars using `account.inflationRate`
  2. **Seasonal component (40%)**: Averages all historical data for same calendar month
  3. **Recency component (60%)**: Weighted average of last 3 months [0.2, 0.3, 0.5]
  4. **Trend adjustment**: Linear regression over 12 months, capped at ±10%
- See `docs/VARIABLE_EXPENSE_ALGORITHM.md` for full mathematical model

**Period Trend Forecasting** (`lib/period-trend-forecast.ts`):
- Real-time spending tracking within a billing period (e.g., credit card cycle)
- Compares actual-to-date vs baseline-expected
- Adjusts remaining-days forecast based on trend ratio
- Returns: `'Trending Higher' | 'Trending Lower' | 'On Track'`
- Used by: `PeriodTrendWidget.tsx` in Dashboard

### 2. Recommendation Engine (`lib/recommendation-engine.ts`)

Orchestrates 6-month lookahead with variance analysis:
- Calls `generateSixMonthForecast()` → array of monthly forecasts
- Calls `analyzeTrends()` → detects balance/expense/variance patterns
- Generates actionable `Suggestion[]` with severity levels
- See: `RecommendationTab.tsx` for UI implementation

### 3. Contribution Calculator (`app/api/contributions/route.ts`)

**POST /api/contributions?accountId=X**:
- Averages variable expenses over next 6 months for stability
- Distributes total monthly expenses proportionally by `annualSalary`
- Updates `incomeRule.contributionAmount` for each person
- Used by: One-click "Apply Recommendation" in RecommendationTab

## Critical Implementation Details

### Date Handling - UTC Everywhere

**Why**: PostgreSQL stores timestamps natively, but mixing local/UTC in application code causes off-by-one day errors.

**Rule**: Always use `lib/date-utils.ts` functions:
```typescript
createDateUTC(year, month, day)  // ✅ For creating dates
formatDateUTC(date)              // ✅ For display (YYYY-MM-DD)
parseDateUTC(string)             // ✅ For parsing user input
getCurrentMonthUTC()             // ✅ For current month
```

**Never use**:
- `new Date(year, month, day)` ❌ (uses local timezone)
- `date-fns` functions without UTC suffix (e.g., use `startOfMonthUTC()` not `startOfMonth()`)

### JSON String Fields in Prisma

**Income Rules** store pay days as JSON strings:
```typescript
// In DB: payDays = "[1,15]"
const rule = await prisma.incomeRule.findUnique(...);
const days: number[] = JSON.parse(rule.payDays);  // ✅

// When updating:
await prisma.incomeRule.update({
  data: { payDays: JSON.stringify([1, 15]) }  // ✅
});
```

### Transaction Linking Pattern

Transactions can be "actualized" forecasted events:
- `incomeRuleId` → links to salary deposit forecast
- `recurringExpenseId` → links to expense forecast
- Used by: `ActualizeEventDialog.tsx` to convert forecast → actual transaction
- Enables: Variance analysis (forecasted vs actual amounts)

## API Design Patterns

### RESTful Routes
- `GET /api/resource` → list all
- `POST /api/resource` → create
- `GET /api/resource/[id]` → get one
- `PATCH /api/resource/[id]` → update
- `DELETE /api/resource/[id]` → delete

### Special Endpoints
- **POST /api/contributions?accountId=X** → Calculates and updates contribution amounts
- **POST /api/period-trend-forecast** → Real-time spending trend analysis
- **GET /api/forecast?accountId=X&year=YYYY&month=M** → Month forecast
- **GET /api/recommendations?accountId=X&year=YYYY&month=M** → 6-month outlook

### Error Handling Standard
```typescript
try {
  // Validate query params first
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }
  const data = await someOperation();
  return NextResponse.json(data);
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  );
}
```

## Component Patterns

### Client-Side State Management
**All tab components use this pattern**:
```typescript
'use client';
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, [accountId, year, month]);  // Re-fetch when dependencies change

async function fetchData() {
  const res = await fetch('/api/endpoint');
  const json = await res.json();
  setData(json);
  setLoading(false);
}
```

### Dialog Pattern (Radix UI)
```typescript
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Portal>
    <Dialog.Overlay style={overlayStyle} />
    <Dialog.Content style={contentStyle}>
      {/* Form with controlled inputs */}
      <input value={name} onChange={e => setName(e.target.value)} />
      <button onClick={handleSubmit}>Save</button>
      {/* Reset state when dialog closes */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### CSS Variables for Theming
Theme context provides CSS custom properties:
```typescript
// In ThemeContext.tsx
document.documentElement.style.setProperty('--bg-primary', isDark ? '#1a1a1a' : '#ffffff');

// In components
<div style={{ background: 'var(--bg-primary)' }}>
```

### Responsive Design Pattern

**Current Challenge**: Inline styles don't support media queries directly.

**Solution**: Use `window.matchMedia` hook + CSS custom properties for breakpoints:

```typescript
// In component
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  setIsMobile(mediaQuery.matches);
  
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}, []);

// Conditional styles
<div style={{
  padding: isMobile ? '1rem' : '2rem',
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
}}>
```

**Font Size System** (defined in `globals.css`):
- **Body text**: `var(--font-body)` → 14px (0.875rem) desktop, 12px (0.75rem) mobile
- **Labels/secondary**: `var(--font-label)` → 11px (0.6875rem) desktop, 10px (0.625rem) mobile  
- **Small/compact**: `var(--font-small)` → 12px (0.75rem) desktop, 11px (0.6875rem) mobile
- **Headers**: Use explicit rem values (h1: 1.5rem, h2: 1.25rem, h3: 1.125rem)

**Always use CSS custom properties for font sizes** instead of hardcoded rem values:
```typescript
// ✅ Correct
<p style={{ fontSize: 'var(--font-body)' }}>Main text</p>
<label style={{ fontSize: 'var(--font-label)' }}>Field label</label>

// ❌ Wrong  
<p style={{ fontSize: '0.875rem' }}>Main text</p>
<label style={{ fontSize: '0.75rem' }}>Field label</label>
```

**Responsive Patterns to Follow**:
- **Container padding**: `2rem` → `1rem` on mobile
- **Grid layouts**: `1fr 1fr` → `1fr` on mobile (< 768px)
- **Font sizes**: Scale down headings by 25-30% on mobile
- **Max widths**: Respect on desktop, use `100%` on mobile
- **Horizontal scrolling**: Wrap tables in `<div style={{ overflowX: 'auto' }}>`
- **Touch targets**: Minimum 44px height for buttons/inputs on mobile

**Breakpoints**:
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

**Example - Responsive Header**:
```typescript
<header style={{
  marginBottom: isMobile ? '1rem' : '2rem',
  flexDirection: isMobile ? 'column' : 'row',
  gap: isMobile ? '1rem' : '0',
  alignItems: isMobile ? 'flex-start' : 'center',
}}>
```

## Development Workflows

### Database Reset (Common During Development)
```powershell
# Drop all data and recreate tables
npx prisma migrate reset

# Or manually reset + seed:
npx prisma migrate reset --skip-seed
npm run db:seed
```

### Running Utility Scripts
Scripts in `/scripts` are executed with `tsx`:
```powershell
npx tsx scripts/import-credit-card-history.ts
npx tsx scripts/link-transactions.ts  # Links imported transactions to recurring expenses
npx tsx scripts/test-variable-expenses.ts  # Validates estimation algorithm
```

### Adding a New Forecasting Feature
1. Define types in `types/index.ts`
2. Implement algorithm in `lib/[feature].ts` (keep < 500 lines)
3. Create API route in `app/api/[feature]/route.ts`
4. Build UI component in `components/[Feature]Tab.tsx`
5. Import component in `app/page.tsx` tabs

### Schema Changes
```powershell
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name description_of_change
# 3. Regenerate Prisma client
npm run db:generate
# 4. Update seed data if needed
# 5. Test with fresh database
npx prisma migrate reset
```

## Project-Specific Conventions

### File Naming
- Components: PascalCase (`ForecastTab.tsx`)
- Utilities: kebab-case (`date-utils.ts`, `variable-expenses-advanced.ts`)
- API routes: `route.ts` in directory structure

### File Size Rule
**Hard limit: 500 lines**
- When approaching limit, extract:
  - Helper functions → separate `lib/` module
  - Sub-components → separate files in same directory
  - Types → `types/index.ts`
- Example: `variable-expenses.ts` became `variable-expenses-advanced.ts` when refactored

### Type Definitions
- Define interfaces in `types/index.ts` for cross-module types
- Local interfaces in same file for single-use types
- Always type function parameters and return values:
```typescript
export async function generateForecast(
  accountId: number,
  year: number,
  month: number
): Promise<ForecastResult> { }
```

### Import Aliases
```typescript
import { prisma } from '@/lib/prisma';  // ✅ Use @/ prefix
import ForecastTab from '@/components/ForecastTab';
import type { Account } from '@/types';
```

## Testing & Validation

### Manual Testing Checklist
When changing forecast logic:
- [ ] Test February (28/29 days)
- [ ] Test 30-day and 31-day months
- [ ] Test pay day > days in month (e.g., payDay=31 in February)
- [ ] Verify balances are precise (`toFixed(2)`)
- [ ] Check with zero income or zero expenses

### Common Edge Cases
- **Pay frequency mismatches**: Income at semi_monthly but expense at monthly
- **Partial month forecasts**: When `account.startDate` is mid-month
- **Variable expenses with no history**: Falls back to configured amount
- **Trend detection with < 6 months data**: Skips trend adjustment

## Common Pitfalls

1. **UTC Date Bug**: Using `new Date(year, month, day)` instead of `createDateUTC()` causes timezone shifts
2. **JSON Parse Forgetting**: `incomeRule.payDays` is a string, not an array
3. **Prisma Version**: Upgrading to 7.x breaks schema syntax and client API
4. **Mutation Side Effects**: Recommendation engine modifies income rules temporarily—must restore original values
5. **Frontend Re-renders**: Changing state in useEffect without dependencies causes infinite loops
6. **Mobile Responsiveness**: Inline styles need `window.matchMedia` hook for breakpoints—test on mobile viewport
7. **Horizontal Overflow**: Wide tables/grids need `overflowX: 'auto'` wrapper on mobile

## Key Design Rationale

**Why inline styles instead of CSS modules?**
- No build-time CSS compilation
- Type-safe with React.CSSProperties
- Co-located with component logic
- Fast iteration for MVP

**Why PostgreSQL instead of SQLite?**
- Production-ready for cloud deployment
- Persistent storage on Railway/Vercel
- Native timestamp types (better than strings)
- ACID compliance and concurrent access
- Easy backups and point-in-time recovery
- Sufficient free tier (512MB on Railway)

**Why separate `variable-expenses-advanced.ts`?**
- Algorithm is complex (inflation + seasonality + recency + trend)
- Needs isolation for testing
- Clear separation from simple forecast logic
- See `docs/VARIABLE_EXPENSE_ALGORITHM.md` for mathematical details

**Why transaction linking (`incomeRuleId`, `recurringExpenseId`)?**
- Enables variance analysis (forecasted vs actual)
- Supports "actualize forecast" workflow
- Improves future predictions via confirmed data
- Foundation for monthly reconciliation feature (see `docs/FORECASTING_APPROACH.md`)

## Documentation References

- `docs/VARIABLE_EXPENSE_ALGORITHM.md` → Mathematical model details
- `docs/FORECASTING_APPROACH.md` → Historical tracking architecture
- `docs/MIGRATION_NOTES.md` → Schema evolution history
- `docs/POSTGRESQL_MIGRATION.md` → SQLite to PostgreSQL migration guide
- `docs/QUICKSTART.md` → Setup guide

## Quick Reference

### Get Current Account
```typescript
const account = await prisma.account.findFirst({
  include: { incomeRules: true, recurringExpenses: true }
});
```

### Parse Pay Days
```typescript
const payDays: number[] = JSON.parse(incomeRule.payDays);
```

### Format Currency
```typescript
const formatted = `$${amount.toFixed(2)}`;  // Always 2 decimals
```

### Color Coding by Severity
```typescript
severity === 'critical' ? 'var(--color-danger)' :
severity === 'warning' ? 'var(--color-warning)' : 
'var(--text-secondary)'
```

---

**When modifying this codebase**:
- ✅ Keep files under 500 lines
- ✅ Use UTC date functions exclusively
- ✅ Add types for all new interfaces
- ✅ Test with database reset
- ✅ Follow established naming conventions
