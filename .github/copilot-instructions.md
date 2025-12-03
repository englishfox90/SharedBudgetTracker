# Copilot Instructions for Shared Balance Planner

## Project Overview

This is a full-stack TypeScript application for managing a shared checking account between two people. The app forecasts daily account balances and recommends contribution percentages to maintain a safe minimum balance.

## Technology Stack & Conventions

### Framework & Language
- **Next.js 14+** with App Router (not Pages Router)
- **TypeScript** for all code (strict mode)
- **React 19** with client components where needed

### Styling & UI
- **Radix UI** components for all interactive elements (dialogs, tabs, selects, etc.)
- **Space Grotesk** font family from Google Fonts (applied globally)
- **Inline styles** using React.CSSProperties for component styling
- **Clean, minimal design** with light theme
- Color palette:
  - Primary: `#1a1a1a` (dark text, buttons)
  - Background: `#fafafa` 
  - Borders: `#e0e0e0`
  - Danger: `#dc2626`
  - Success: `#16a34a`
  - Warning: `#fcd34d`

### Database & ORM
- **SQLite** for local file-based database storage
- **Prisma 5.x** as the ORM (not version 7+)
- Database file: `prisma/dev.db`
- All models use:
  - `@map("snake_case")` for table names
  - camelCase for TypeScript property names
  - Automatic timestamps (`createdAt`, `updatedAt`)

### Code Organization

#### Directory Structure
```
app/
  api/          # Next.js API routes
  layout.tsx    # Root layout
  page.tsx      # Main page with tabs
components/     # React components
lib/            # Business logic modules
  forecast.ts   # Forecast engine
  recommendation.ts  # Recommendation calculator
  variable-expenses.ts  # Historical analysis
  prisma.ts     # Prisma client singleton
prisma/
  schema.prisma # Database schema
  seed.ts       # Seed data
types/
  index.ts      # Shared TypeScript types
```

#### File Size Limit
- **Maximum 500 lines per file**
- Extract functions into separate modules when files grow large
- Keep components focused and modular

## Core Business Logic

### 1. Forecast Engine (`lib/forecast.ts`)

**Purpose**: Simulate daily account balance for a given month

**Key Functions**:
- `generateForecast(accountId, year, month)` - Main entry point
- Generates cash events: income deposits + fixed expenses + variable expenses
- Calculates running balance day-by-day
- Flags days when balance drops below safe minimum

**Variable Expense Estimation**:
- Look back 3 months in transaction history
- Filter by category (e.g., "credit_card_payment")
- Calculate average monthly spend
- Use average as predicted amount

**Important**: All income rules store `payDays` as JSON string (e.g., `"[1,15]"`)

### 2. Recommendation Calculator (`lib/recommendation.ts`)

**Purpose**: Find minimum contribution percentage to maintain safe balance

**Algorithm**:
1. Generate forecast with current contribution %
2. If lowest balance >= safe minimum → return current %
3. Else, increment contribution % by 1% and re-forecast
4. Repeat until balance stays safe OR max % reached (50%)
5. Calculate per-paycheck deposit amount

**Important**: Temporarily updates income rules during calculation, then restores original values

### 3. Variable Expense Analysis (`lib/variable-expenses.ts`)

**Purpose**: Estimate variable expenses from historical transactions

**Logic**:
- Query transactions with `amount < 0` (withdrawals)
- Filter by category and date range
- Group by month
- Return average

## API Design Patterns

### RESTful Conventions
- `GET /api/resource` - List all
- `POST /api/resource` - Create
- `GET /api/resource/[id]` - Get one
- `PATCH /api/resource/[id]` - Update
- `DELETE /api/resource/[id]` - Delete

### Query Parameters
- Always validate required params
- Return 400 Bad Request for missing/invalid params
- Example: `/api/forecast?accountId=1&year=2025&month=12`

### Error Handling
```typescript
try {
  // ... logic
  return NextResponse.json(data);
} catch (error) {
  console.error('Error message:', error);
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  );
}
```

## Frontend Component Patterns

### State Management
- Use `useState` and `useEffect` for local state
- Fetch data on component mount
- Reload data after mutations (create/update/delete)

### Form Handling
- Use Radix Dialog for modal forms
- Controlled inputs with `value` and `onChange`
- Reset form state when dialog closes
- Call `onAdded()` or `onUpdate()` callback after successful submission

### Styling Approach
```typescript
const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  // ...
};

<button style={buttonStyle}>Click Me</button>
```

### Date Handling
- Use `date-fns` for all date operations
- Store dates as ISO strings in API responses
- Parse with `parseISO()` when displaying

## Database Schema Conventions

### Naming
- Table names: `snake_case` with `@@map("table_name")`
- Column names: `camelCase` in Prisma, snake_case in SQL
- Relations: Use descriptive names (e.g., `incomeRules`, not `income`)

### Relations
- Use `onDelete: Cascade` for dependent records
- Always define both sides of relation

### JSON Fields
- Store arrays as JSON strings: `payDays: String` contains `"[1,15]"`
- Parse with `JSON.parse()` and stringify with `JSON.stringify()`

## Common Tasks

### Adding a New API Endpoint
1. Create file in `app/api/[resource]/route.ts`
2. Export async functions: `GET`, `POST`, etc.
3. Use `prisma` from `@/lib/prisma`
4. Validate input, handle errors, return `NextResponse.json()`

### Adding a New Component
1. Create file in `components/[Name].tsx`
2. Use `'use client'` directive if using hooks
3. Import Radix UI components as needed
4. Define inline styles at bottom of file
5. Keep under 500 lines

### Adding a Database Field
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push`
3. Run `npm run db:generate`
4. Update TypeScript types in `types/index.ts`
5. Update seed script if needed

### Testing Changes
1. Reset database: `Remove-Item prisma\dev.db; npm run db:push; npm run db:seed`
2. Start dev server: `npm run dev`
3. Navigate to http://localhost:3000

## Best Practices

### TypeScript
- Always define types for function parameters and return values
- Use `interface` for data models
- Import types from `@/types`

### React
- Prefer function components
- Use `'use client'` only when necessary (hooks, events)
- Memoize expensive calculations with `useMemo` if needed

### Performance
- Fetch data once per page load
- Avoid N+1 queries (use Prisma `include`)
- Use `Promise.all()` for parallel requests when safe

### Accessibility
- Radix UI components provide good defaults
- Always include labels for form inputs
- Use semantic HTML when possible

### Security
- Validate all user input
- Sanitize data before database queries
- Prisma handles SQL injection prevention

## Common Pitfalls

1. **Prisma Version**: This project uses Prisma 5.x. Version 7+ has breaking changes.
2. **JSON Fields**: Remember to `JSON.parse()` payDays before using
3. **Date Handling**: SQLite stores dates as strings; parse carefully
4. **Client Components**: Mark with `'use client'` if using hooks or event handlers
5. **Forecast Mutations**: Recommendation calculator temporarily modifies data; must restore original state

## Development Workflow

1. **New Feature**:
   - Define data model in Prisma schema
   - Create API routes
   - Write business logic in `lib/`
   - Build UI components
   - Test end-to-end

2. **Bug Fix**:
   - Identify layer (DB, API, logic, UI)
   - Add logging if needed
   - Fix issue in appropriate module
   - Verify in browser

3. **Refactoring**:
   - Keep files under 500 lines
   - Extract reusable logic to `lib/`
   - Extract reusable components to `components/`
   - Update types as needed

## Key Design Decisions

### Why Next.js App Router?
- Unified full-stack framework
- API routes and pages in one project
- Built-in TypeScript support
- Server components by default

### Why SQLite?
- Local file-based (no server setup)
- Perfect for single-user or small team use
- Easy to backup (just copy the file)
- Great for MVP and development

### Why Radix UI?
- Unstyled, accessible primitives
- Full control over styling
- No opinionated design system
- Minimal bundle size

### Why Inline Styles?
- No CSS-in-JS runtime
- Co-located with components
- TypeScript type safety
- Fast iteration for MVP

## Testing Recommendations

When implementing new features:
- Test with various month lengths (Feb, 30-day, 31-day)
- Test edge cases (pay day > days in month)
- Test with zero income or expenses
- Verify balance calculations are precise (use `toFixed(2)`)

## Future Considerations

The architecture supports these extensions:
- Multiple accounts (already in schema)
- Different pay frequencies (modify income rules)
- Custom categories (add to schema)
- User authentication (add auth provider)
- Dark mode (add theme context)

---

When assisting with this project, always:
✅ Respect the 500-line file limit
✅ Use Radix UI for new UI components
✅ Follow the established folder structure
✅ Add TypeScript types for new data
✅ Handle errors gracefully
✅ Keep code modular and testable
