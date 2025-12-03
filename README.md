# Shared Balance Planner

A full-stack web application that helps two people manage a shared checking account, forecast the balance throughout the month, and decide how much to contribute from their salaries.

## Features

- 📊 **Forecast Engine**: Simulate daily balance across the month based on income and expenses
- 💰 **Smart Recommendations**: Get personalized contribution percentage recommendations
- 🎯 **Balance Warnings**: Visual alerts when balance drops below safe minimum
- 📅 **Variable Expense Estimation**: Automatically estimate variable costs from historical data
- 📝 **Easy Setup**: Configure accounts, income sources, and recurring expenses
- 📤 **CSV Import**: Import historical transactions from CSV files

## Tech Stack

- **Frontend**: React + TypeScript + Next.js (App Router)
- **Component Library**: Radix UI
- **Typography**: Space Grotesk (Google Fonts)
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Utilities**: date-fns, papaparse

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd d:\Projects\SharedBudgetTracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the database**:
   ```bash
   npm run db:push
   ```

4. **Seed the database with sample data**:
   ```bash
   npm run db:seed
   ```
   
   This creates:
   - A shared checking account with $2,500 starting balance
   - Two income sources (Paul and Jameson, each contributing 25%)
   - Six recurring expenses (mortgage, HOA, utilities, etc.)
   - Historical transactions for variable expense estimation

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

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
- **Balance Warnings**: Days when balance drops below safe minimum are highlighted in red
- **Summary Stats**: View starting balance, lowest projected balance, and warning count

#### How Forecast Calculation Works

1. **Generate Cash Events**:
   - Income deposits on configured pay days (e.g., 1st and 15th)
   - Fixed expenses on their scheduled days
   - Variable expenses using historical averages

2. **Simulate Daily Balance**:
   - Start with the account's starting balance
   - For each day, apply all scheduled events
   - Calculate opening balance, net change, and closing balance
   - Flag days when balance drops below safe minimum

3. **Variable Expense Estimation**:
   - Looks back N months (default: 3) in transaction history
   - Filters transactions by category (e.g., "credit_card_payment")
   - Calculates average monthly spend
   - Uses this average as the predicted variable cost

### 3. Recommendation Tab

Get smart contribution recommendations:

- **Current vs. Recommended**: Compare your current contribution percentage with what's needed
- **Balance Impact**: See how the recommendation affects your lowest balance
- **One-Click Apply**: Update all income sources to the recommended percentage
- **Monthly Analysis**: Run recommendations for any future month to plan ahead

#### How Recommendation Calculation Works

1. **Baseline Forecast**: Generate a forecast with current contribution percentages
2. **Check Safety**: If lowest balance stays above safe minimum, you're all set!
3. **Optimize Contribution**:
   - If balance goes too low, incrementally increase contribution percentage
   - Test each increment until balance stays above safe minimum
   - Find the minimum contribution needed (up to 50% max)
4. **Per-Paycheck Amount**: Calculate exact dollar amount to deposit each pay period

### 4. CSV Import (Optional)

Import historical transactions to improve variable expense estimation:

**CSV Format**:
```csv
date,amount,description,category
2024-11-10,-850.00,Credit Card Payment,credit_card_payment
2024-11-01,750.00,Paul Contribution,income
```

- **date**: ISO format (YYYY-MM-DD)
- **amount**: Positive for deposits, negative for withdrawals
- **description**: Transaction description
- **category**: Category (used for variable expense estimation)

## Database Schema

### Tables

1. **accounts**: Shared account details (balance, safe minimum)
2. **income_rules**: Income sources with contribution rules
3. **recurring_expenses**: Fixed and variable recurring expenses
4. **transactions**: Historical transaction data for analysis

See `prisma/schema.prisma` for full schema details.

## Project Structure

```
SharedBudgetTracker/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── accounts/     # Account CRUD
│   │   ├── income-rules/ # Income source management
│   │   ├── expenses/     # Expense management
│   │   ├── forecast/     # Forecast generation
│   │   ├── recommendation/ # Recommendation calculator
│   │   └── import/       # CSV import
│   ├── layout.tsx        # Root layout with Space Grotesk
│   ├── page.tsx          # Main app with tabs
│   └── globals.css       # Global styles
├── components/
│   ├── SetupTab.tsx      # Setup page with forms
│   ├── ForecastTab.tsx   # Forecast visualization
│   └── RecommendationTab.tsx # Recommendation display
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   ├── forecast.ts       # Forecast engine logic
│   ├── recommendation.ts # Recommendation calculator
│   └── variable-expenses.ts # Historical analysis
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data script
└── types/
    └── index.ts          # TypeScript types
```

## API Endpoints

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `GET /api/accounts/[id]` - Get account details
- `PATCH /api/accounts/[id]` - Update account
- `DELETE /api/accounts/[id]` - Delete account

### Income Rules
- `GET /api/income-rules?accountId=1` - List income rules
- `POST /api/income-rules` - Create income rule
- `PATCH /api/income-rules/[id]` - Update income rule
- `DELETE /api/income-rules/[id]` - Delete income rule

### Expenses
- `GET /api/expenses?accountId=1` - List expenses
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Forecast
- `GET /api/forecast?accountId=1&year=2025&month=12` - Generate forecast

### Recommendation
- `GET /api/recommendation?accountId=1&year=2025&month=12` - Get recommendation

### Import
- `POST /api/import` - Import CSV transactions (multipart/form-data)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with sample data

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
