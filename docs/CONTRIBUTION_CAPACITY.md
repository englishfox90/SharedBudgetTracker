# Contribution capacity, taxes and deductions

## The problem this solves

Contributions used to be derived from **gross** annual salary. Nothing in the
app knew what a paycheck actually deposits, so nothing stopped a recommendation
from asking for more than someone takes home.

On the numbers that prompted this work, one earner's recommended contribution
was **$4,324.72 per semi-monthly paycheck against a net deposit of $4,347.33** —
99.5% of take-home. The split was also unfair: shares were proportional to gross
salary (79/21), which ignored that one earner's check absorbed every health
deduction for the household.

Two things were missing, and both are now modelled.

## 1. What a paycheck really deposits

`lib/paycheck.ts` turns a gross salary into take-home, the way payroll does:

1. Subtract pre-tax deductions from gross.
2. Annualise what is left, apply the standard deduction, run it through the
   federal brackets, divide back down to one pay period.
3. Apply FICA and state tax.
4. Subtract post-tax deductions.

Deductions carry a **tax treatment**, because it changes the answer:

| Treatment | Examples | Escapes income tax | Escapes FICA |
|---|---|---|---|
| `pre_tax_section_125` | Medical, dental, vision, HSA, FSA | yes | yes |
| `pre_tax_retirement` | Traditional 401(k), 403(b) | yes | no |
| `post_tax` | Roth 401(k), voluntary insurance | no | no |

Federal tax constants live in `lib/tax-tables.ts` and need verifying each
January. `TAX_YEAR` marks which year they describe.

### Accuracy

`npm run verify:paycheck` reconciles the estimator against a real semi-monthly
stub. Every line — FICA wages, taxable wages, OASDI, Medicare, federal, state,
total taxes, net — matches to the cent. Withholding lines are rounded
individually before totalling, because that is the order payroll uses; summing
first and rounding once drifts a cent.

The estimate is only as good as what it is given. The same salary with **no
deductions recorded** estimates $5,261.92 a check against an actual $4,347.33 —
$914.59 too generous. Recording deductions is what closes that gap.

When a real stub is available, `netPayOverride` stores the actual take-home and
wins over the estimate. A W-4 can move withholding in ways brackets cannot
predict, and no model beats the real number.

## 2. Nothing is asked for more than it can give

Every path that writes a contribution amount goes through
`lib/contribution-capacity.ts`.

**The ceiling.** Each income source carries `maxContributionPct`, defaulting to
0.8. Capacity is `net pay × maxContributionPct`, leaving a personal buffer for
anything outside the shared budget.

**The guard.** `evaluateContribution` checks a proposed amount against one
paycheck. Both `POST /api/income-rules` and `PATCH /api/income-rules/[id]`
call it and return **422** with the reason and the maximum that would have been
accepted. The PATCH deliberately still allows editing a rule that is *already*
over its ceiling — otherwise the fields needed to fix it would be unreachable.

**The split.** `allocateContributions` divides an annual cash need:

1. Shares are proportional to what each person could put toward the household if
   shared benefits were free — take-home **plus** the shared benefits their
   paycheck already buys.
2. Each person's shared benefits are credited against their share, so the cash
   asks still sum to exactly the cash need.
3. Anyone whose fair share lands above their ceiling is pinned there and the
   remainder is pushed onto whoever still has room.
4. When nobody has room, the leftover is reported as `shortfallAnnual` and
   `feasible` is false.

That last step is the point. A shortfall means the shared expenses are larger
than the paychecks can cover, and no contribution setting fixes it — the answer
is to cut expenses or raise a ceiling, and the app says so instead of loading a
paycheck that cannot carry it.

`npm run verify:contributions` exercises all of this, including the edge cases:
zero need, no income sources, a sole earner.

## 3. Shared benefits

When one person's paycheck buys family health insurance, that money is already a
household contribution — it just never passes through the joint account.
Splitting the cash bill without accounting for it charges that person twice.

Mark such a deduction `isSharedBenefit` and it is added to the household cost,
counted toward that person's share, and credited against their cash ask.

## 4. Where the limits surface

- **Setup → Income sources**: each card shows take-home per check, the ceiling,
  headroom, and a meter for the share of take-home in use. Over-capacity rules
  are badged.
- **Setup → household summary**: combined take-home, what is committed, and the
  room left.
- **Setup → Calculate contributions**: reports the resulting split per person,
  and an infeasible split gets its own dialog naming the monthly shortfall.
- **Insights → Action required**: the recommended total is clamped to combined
  capacity. When clamping happens, a banner names the unfunded monthly gap and
  says it has to come out of expenses.
- **Insights → confirm dialog**: per-person new amount, share of take-home,
  ceiling, and a warning when the plan is still short.

The recommendation engine also raises two critical suggestions of its own:
*contributions alone cannot close this gap*, and *X is set beyond what that
paycheck can carry*.

## Changing the defaults

- **Ceiling**: per income source, in the edit dialog. It is a percentage of
  take-home.
- **Split basis**: proportional to take-home pay. Changing it means changing the
  `basis` map in `allocateContributions`.
- **Tax year**: `lib/tax-tables.ts`. Run `npm run verify:paycheck` afterwards —
  it is what fails first when the tables go stale.
