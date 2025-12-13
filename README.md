# Shared Balance Planner

A full-stack TypeScript application for managing a shared checking account between two people. The app forecasts daily account balances and recommends contribution percentages to maintain a safe minimum balance.

## Features

- **Dashboard**: Quick overview with predicted balance, month-end balance, transfer alerts, and contribution insights
- **Forecast**: Day-by-day cash flow projection showing income deposits and expenses
- **Recommendations**: AI-powered financial suggestions
  - Automatic contribution adjustment calculator with one-click implementation
  - 6-month financial outlook with trend analysis
  - Actionable insights for variable expense management
- **Period Trend Forecast**: Predict variable expenses using weighted historical patterns
- **Transactions**: Track and manage actual transactions vs. forecasts
- **Setup**: Configure income rules and recurring expenses

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma 5.x ORM
- **UI Components**: Radix UI
- **Styling**: Inline React styles with responsive CSS custom properties
- **Date Handling**: date-fns (UTC-first approach)
- **Font**: Space Grotesk (Google Fonts)
- **Deployment**: Railway-ready with persistent storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- **PostgreSQL 14+** (for local development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/englishfox90/SharedBudgetTracker.git
   cd SharedBudgetTracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**:
   
   **If migrating from SQLite** (existing users):
   - See **[PostgreSQL Migration Guide](docs/POSTGRESQL_MIGRATION.md)** for complete instructions
   - Your existing data will be preserved!

   **New installation**:
   ```bash
   # Install PostgreSQL (Windows with Chocolatey)
   choco install postgresql
   
   # Create database
   psql -U postgres
   CREATE DATABASE shared_budget_tracker;
   \q
   
   # Create .env file
   Copy-Item .env.example .env
   # Edit .env and set your PostgreSQL password
   ```

4. **Set up the database**:
   ```bash
   # Run migrations to create tables
   npx prisma migrate dev --name init
   
   # Generate Prisma client
   npm run db:generate
   
   # Seed the database with initial data
   npm run db:seed
   ```

   This creates:
   - A shared checking account with sample starting balance
   - Two income sources with contribution schedules
   - Recurring expenses (fixed and variable)
   - Historical daily spending patterns for trend analysis

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio (database GUI)

## How It Works

### 1. Setup Tab

Configure your shared financial setup:

- **Account Settings**: Set starting balance and safe minimum threshold
- **Income Sources**: Define who contributes, their monthly salary, and contribution percentage
- **Recurring Expenses**: Add fixed expenses (mortgage, utilities) and variable expenses (credit card payments)

### 2. Forecast Tab

View a detailed forecast of your shared account balance:

- **Monthly View**: Select any month to see daily balance projections
- **Event Tracking**: See all income deposits and expense withdrawals by date
### Dashboard Tab

Quick overview with actionable insights:

- **Predicted Balance Today**: Current day's forecasted balance
- **Estimated Month End Balance**: Projected balance at month's end
- **Transfer Needed Alert**: Earliest upcoming balance violation (color-coded by severity)
- **Contribution Insights**: Status of recommended adjustments
- **Missing Transactions Banner**: Alerts when past forecast events need actual transaction data

### Forecast Tab

Detailed day-by-day cash flow projection:

- **Monthly View**: Navigate any month to see daily balance projections
- **Event Tracking**: All income deposits and expense withdrawals by date
- **Balance Warnings**: Days below safe minimum highlighted in orange
- **Actual vs. Forecast**: Green badges for actualized transactions, yellow for forecasts

#### Forecast Calculation

1. **Generate Cash Events**:
   - Income deposits on configured pay days
   - Fixed expenses on their scheduled days
   - Variable expenses using historical averages

2. **Simulate Daily Balance**:
   - Start with account's current balance
   - Apply all scheduled events for each day
   - Calculate opening balance, net change, and closing balance
   - Flag days when balance drops below safe minimum

3. **Variable Expense Estimation**:
   - Analyzes last 3 months of transaction history
   - Filters by expense category
   - Calculates average monthly spend
   - Uses average as predicted amount

### Recommendation Tab

Smart financial guidance with automated implementation:

- **Action Required Card**: One-click contribution adjustment with confirmation modal
- **6-Month Forecast Overview**: Visual timeline of projected balances
- **Trend Analysis**: Identify expense categories trending higher or lower
- **Recommendation Insights**: Balance warnings, contribution suggestions, and expense alerts

#### Recommendation Algorithm

1. **Analyze Future Months**: Generate 6-month forecast (excluding current month if past mid-month)
2. **Check Balance Health**: 
   - If future balances stay above safe minimum → No action needed
   - If declining or below minimum → Calculate adjustment
3. **Calculate Contribution Increase**:
   - Cover shortfall to reach safe minimum (100% buffer)
   - Target positive monthly growth ($150+/month)
   - Add 20% variability buffer
4. **Minimum Threshold**: Only recommend if increase ≥ 0.5% AND ≥ $500/year
5. **Implementation**: Update all income rules proportionally with user confirmation

### Period Trend Forecast

Advanced variable expense prediction using weighted algorithm:

- **Current Period Rate** (50%): Spending rate so far this period
- **Recent 3-Month Average** (30%): Recent spending trend
- **Historical Daily Patterns** (20%): Day-of-month spending patterns scaled to current level

**Example**: Predict credit card spending by analyzing daily patterns from historical data

### Transactions Tab

Track actual vs. forecasted transactions:

- View all transactions with category filters
- Add new transactions manually
- Link transactions to forecast events
- Update forecasted amounts with actuals

## Database Management

The app uses SQLite stored at `prisma/dev.db` (excluded from git).

### Reset Database
```bash
# Windows PowerShell
Remove-Item prisma\dev.db
npm run db:push
npm run db:seed

# Unix/Mac
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### Database Schema

**Main Tables**:
- `accounts`: Shared account details (balance, safe minimum)
- `incomeRules`: Income sources with contribution schedules
- `recurringExpenses`: Fixed and variable recurring expenses
- `transactions`: Historical transaction data
- `dailySpendingAverages`: 366 days of historical spending patterns

See `prisma/schema.prisma` for full schema.

## Project Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── accounts/
│   │   ├── income-rules/
│   │   ├── expenses/
│   │   ├── forecast/
│   │   ├── recommendations/
│   │   └── period-trend-forecast/
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard with tabs
├── components/            # React components
│   ├── DashboardTab.tsx
│   ├── DashboardSummaryWidgets.tsx
│   ├── ForecastTab.tsx
│   ├── RecommendationTab.tsx
│   ├── PeriodTrendWidget.tsx
│   └── recommendations/   # Recommendation subcomponents
├── lib/                   # Business logic
│   ├── forecast.ts        # Forecast engine
│   ├── recommendation-engine.ts
│   ├── period-trend-forecast.ts
│   ├── six-month-forecast.ts
│   ├── trend-detection.ts
│   └── prisma.ts          # Prisma client
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── types/
│   └── index.ts           # Shared TypeScript types
└── scripts/
    └── daily_spending.tsv # Historical daily patterns
```

## Key Features Explained

### Smart Alerts

**Missing Transactions Banner**:
- Appears when past forecast events haven't been actualized
- Only counts expense transactions (not income contributions)
- Click "Update Transactions" to navigate to Transactions tab

**Transfer Needed Widget**:
- Shows **earliest** upcoming balance violation (not worst case)
- Color-coded severity:
  - 🟠 Orange: Below $500 safe minimum
  - 🔴 Red: Balance will go negative
- Excludes past days (can't fix history)

**Contribution Insights Widget**:
- Shows "Action Required" only when `adjustmentNeeded` flag is true
- "On Track" when contributions are sufficient
- Navigate to Recommendations tab for details

## Design Principles

### Styling
- **Inline React styles** for component-level styling
- **Space Grotesk** font family throughout
- **Color palette**:
  - Primary: `#1a1a1a` (dark text, buttons)
  - Background: `#fafafa`
  - Borders: `#e0e0e0`
  - Success: `#16a34a`
  - Warning: `#fcd34d` / `#d97706`
  - Danger: `#dc2626`

### File Size Limit
- Maximum **500 lines per file**
- Extract functions into separate modules when files grow large
- Keep components focused and modular

### Code Conventions
- **TypeScript strict mode** enabled
- **Table names**: `snake_case` with `@@map()`
- **Property names**: `camelCase` in TypeScript
- **Pay days**: Stored as JSON strings (e.g., `"[1,15]"`)

## Common Tasks

### Reset Database Completely
```bash
Remove-Item prisma\dev.db
npm run db:push
npm run db:generate
npm run db:seed
```

### View Database Contents
```bash
npm run db:studio
```
Opens Prisma Studio at http://localhost:5555

### Add New Income Rule
1. Go to Setup tab
2. Click "+ Add Income Source"
3. Configure name, salary, contribution %, frequency, pay days
4. Save

### Import Historical Data
Place `daily_spending.tsv` in `scripts/` directory with format:
```
date	amount
12-01	9.37
12-02	17.92
```

## Troubleshooting

**Database not found**:
```bash
npm run db:push
npm run db:seed
```

**Prisma client out of sync**:
```bash
npm run db:generate
```

**Port 3000 already in use**:
```bash
# Change port in package.json dev script
"dev": "next dev -p 3001"
```

## Future Enhancements

Potential features for future development:
- Multiple accounts support
- User authentication
- Mobile responsive design
- Dark mode theme
- Export reports to PDF
- Shared access for both partners
- Budget vs. actual comparisons

## Contributing

This is a personal project, but suggestions and feedback are welcome via GitHub issues!

## License

MIT

## Acknowledgments

Built with ❤️ to simplify shared financial management between partners.

### Database Management

To reset the database:
```bash
# Delete the database file
Remove-Item prisma\dev.db

# Recreate and seed
npm run db:push
npm run db:seed
```

To modify the schema:
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push`
3. Run `npm run db:generate`

## Design Philosophy

### Modular Architecture
- Files kept under 500 lines for maintainability
- Clear separation between business logic (lib/), API routes (app/api/), and UI (components/)
- Reusable TypeScript types in dedicated types/ directory

### Clean UI/UX
- Minimal, modern design with Space Grotesk typography
- Consistent color scheme and spacing
- Radix UI components for accessibility and polish
- Visual feedback for important states (warnings, success)

### Scalability Considerations
- Database schema supports multiple accounts (future-proof)
- API routes designed for easy extension
- Component architecture allows adding new tabs/features
- Forecast and recommendation logic are pure functions

## Future Enhancements

Potential features to add:

- Multiple account support (select active account)
- Custom pay schedules beyond semi-monthly
- Budget categories and spending insights
- Actual vs. projected balance tracking
- Email/SMS notifications for low balance
- Multi-user authentication
- Dark mode theme
- Export forecast to PDF or Excel

## License

ISC

## Author

Built with ❤️ for shared financial planning
