# Forecasting & Historical Tracking Approach

## Current State
- Expenses are stored in `recurring_expenses` table with current values
- Forecasts are generated dynamically based on current expense data
- Historical transactions are imported but not linked to expense snapshots

## Problem
When forecasting past months or analyzing historical data:
- If an expense amount changed (e.g., rent increased from $1200 to $1300), historical forecasts would use the NEW amount
- No way to track "what were the actual expenses in January 2024?"
- Difficult to improve forecasting accuracy without historical baseline

## Proposed Solutions

### Option 1: Monthly Expense Snapshots (Recommended)
**Concept**: Before forecasting each month, create a snapshot of all recurring expenses for that month.

**Implementation**:
```typescript
// New table: expense_snapshots
model ExpenseSnapshot {
  id                Int      @id @default(autoincrement())
  accountId         Int
  year              Int
  month             Int
  expenseId         Int      // Link to original recurring_expense
  name              String
  amount            Float
  dayOfMonth        Int
  category          String
  frequency         String
  isVariable        Boolean
  actualAmount      Float?   // User can confirm/adjust after month ends
  confirmedAt       DateTime?
  createdAt         DateTime @default(now())
  
  @@unique([accountId, year, month, expenseId])
  @@map("expense_snapshots")
}
```

**Workflow**:
1. **Beginning of Month**: Auto-create snapshots from `recurring_expenses`
2. **During Month**: Use snapshots for forecasting that month
3. **End of Month**: User reviews and confirms actual amounts (monthly reconciliation)
4. **Future**: Snapshots improve variable expense estimates

**Benefits**:
- ✅ Historical accuracy preserved
- ✅ Can compare forecasted vs actual
- ✅ Improves machine learning for variable expenses
- ✅ Audit trail for expense changes
- ✅ Supports "monthly review" workflow

**User Experience**:
- Add "Review & Confirm" tab/section
- Shows current month's expenses with actual vs forecasted
- User can adjust amounts based on reality
- Helps answer: "Why was my forecast wrong?"

---

### Option 2: Active Date Ranges (Simpler)
**Concept**: Use existing `activeFrom` and `activeTo` fields more aggressively.

**Implementation**:
- When user edits an expense, end-date the old one and create a new record
- Forecasting uses expenses active during the target month
- Keep full history as separate records

**Example**:
```
Rent (activeFrom: 2024-01-01, activeTo: 2024-06-30) - $1200
Rent (activeFrom: 2024-07-01, activeTo: null) - $1300
```

**Benefits**:
- ✅ Simple to implement
- ✅ No new tables needed
- ✅ Historical accuracy

**Drawbacks**:
- ❌ No "confirmation" workflow
- ❌ Clutters expense list over time
- ❌ Harder to track variable expense accuracy

---

### Option 3: Hybrid Approach
**Concept**: Combine both approaches

**Implementation**:
1. Use active date ranges for major changes (rent increase, new expense)
2. Use monthly snapshots for variance tracking and ML improvements
3. Snapshots reference the active expense at time of creation

**Benefits**:
- ✅ Best of both worlds
- ✅ Clean current view (only active expenses)
- ✅ Rich historical data for analysis
- ✅ Supports reconciliation workflow

---

## Recommended Path Forward

### Phase 1: Add Monthly Reconciliation
1. Create `expense_snapshots` table
2. Add API endpoint: `POST /api/snapshots/create?year=2025&month=1`
3. Add "Monthly Review" tab showing:
   - Forecasted amounts from snapshot
   - Input fields for actual amounts
   - Variance highlighting
   - Confirm button

### Phase 2: Auto-snapshot Creation
1. Add cron job or manual trigger to create snapshots at month start
2. Update forecast engine to use snapshots for past/current month
3. Fall back to `recurring_expenses` for future months

### Phase 3: Learning from History
1. Use confirmed snapshots to improve variable expense estimates
2. Show trends: "Credit card payment averaging $X over last 6 months"
3. Alert if forecast significantly differs from historical average

### Phase 4: Expense Change Tracking
1. When editing an expense, optionally create new record with date range
2. Preserve old values for historical accuracy
3. UI shows "History" for each expense

---

## Sample User Workflow

**At Month Start** (e.g., January 1st):
```
User clicks: "Set Up January Forecast"
→ System creates snapshots of all recurring expenses
→ Forecast generated using these snapshots
```

**During Month**:
```
User views forecast → uses snapshot data
User edits expense → updates recurring_expense (future months)
January forecast unchanged (still uses snapshot)
```

**At Month End** (e.g., January 31st):
```
User clicks: "Review January"
→ Shows table of expenses:
   - Rent: Forecasted $1235, Actual: $___
   - Credit Card: Forecasted $7555, Actual: $___
→ User fills in actual amounts
→ System calculates variance
→ Updates variable expense estimates
```

**Benefit**: 
- Continuous learning improves future forecasts
- Historical data remains accurate
- User has monthly touchpoint to stay engaged

---

## Decision Questions

1. **How important is historical accuracy?**
   - Very important → Option 1 or 3
   - Somewhat important → Option 2

2. **Do users want monthly review workflow?**
   - Yes → Option 1 or 3
   - No → Option 2

3. **Should expense edits be versioned?**
   - Yes → Option 3 (hybrid)
   - No → Option 1 (snapshots only)

4. **When should snapshots be created?**
   - Manual (user clicks "Forecast January")
   - Automatic (cron job on 1st of month)
   - On-demand (first time viewing forecast for that month)

---

## Quick Implementation (MVP)

For immediate needs, implement **lazy snapshot creation**:

1. When generating forecast for a month:
   ```typescript
   async function generateForecast(accountId, year, month) {
     // Check if snapshots exist
     const snapshots = await getOrCreateSnapshots(accountId, year, month);
     
     // Use snapshots instead of recurring_expenses
     const events = generateEventsFromSnapshots(snapshots);
     // ... rest of forecast logic
   }
   ```

2. `getOrCreateSnapshots()`:
   - If snapshots exist for this month → return them
   - If not → create from current `recurring_expenses` and return
   - Once created, they're immutable (unless user explicitly confirms/edits)

This gives you historical accuracy with minimal changes!

---

**Next Steps**: 
Choose an approach and I can implement the database schema + API routes + UI components.
