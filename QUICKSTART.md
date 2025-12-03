# Quick Start Guide

## First Time Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run db:push
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open Browser
Navigate to: http://localhost:3000

---

## What You'll See

### Setup Tab
- **Account Settings**: Shared checking account with $2,500 starting balance, $500 safe minimum
- **Income Sources**: 
  - Paul's Salary: $6,000/month, 25% contribution
  - Jameson's Salary: $5,500/month, 25% contribution
  - Both paid semi-monthly (1st and 15th)
- **Expenses**: Mortgage, HOA, utilities, credit card payment, etc.

### Forecast Tab
- Select any month to see daily balance projections
- Red highlights indicate days below safe minimum
- Summary shows lowest balance and warning count

### Recommendation Tab
- See if current contribution % is sufficient
- Get recommended contribution increase if needed
- Apply recommendation with one click

---

## Quick Tasks

### Adjust Contribution Percentage
1. Go to **Setup** tab
2. Find an income source
3. Click **Edit**
4. Change percentage, click **Save**
5. Go to **Forecast** tab to see updated projection

### Add New Expense
1. Go to **Setup** tab
2. Click **Add Expense**
3. Fill in: Name, Amount, Day of Month, Category
4. Check "Variable expense" if amount should be estimated from history
5. Click **Add**

### Import Transactions
1. Prepare CSV file with columns: date, amount, description, category
2. Go to **Setup** tab, scroll to **Import Historical Data**
3. Choose file, click **Import CSV**
4. Variable expense estimates will update automatically

### Get Recommendation
1. Go to **Recommendation** tab
2. Select month to analyze
3. See if current contribution keeps balance safe
4. If not, click **Apply This Recommendation** to increase contribution

---

## Sample Data Included

The seed creates:
- 1 shared checking account
- 2 income sources (Paul & Jameson)
- 6 recurring expenses
- 9 historical transactions (for variable expense estimation)

Try it out!
