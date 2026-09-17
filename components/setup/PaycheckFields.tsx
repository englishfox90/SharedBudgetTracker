'use client';

import { useId } from 'react';
import * as Label from '@radix-ui/react-label';
import { estimatePaycheck, DEDUCTION_TREATMENT_LABELS, DeductionTreatment } from '@/lib/paycheck';
import { FILING_STATUS_LABELS, FilingStatus, FLAT_STATE_RATES } from '@/lib/tax-tables';
import { PaycheckDeduction } from '@/types';
import { formatMoney } from '@/lib/actualize';
import { PlusIcon, TrashIcon } from '../icons';

/**
 * A deduction while it is being typed.
 *
 * `amount` is a string rather than a number because a controlled numeric input
 * cannot hold the half-finished values a person types on the way to a real one:
 * parsing "12." back to 12 eats the decimal point, so cents become unreachable.
 * It is parsed once, in `paycheckFormToPayload`.
 *
 * `key` is a stable identity for the row. Indexes would let React reuse the DOM
 * node of a deleted row, moving focus to the wrong line mid-edit.
 */
export interface DeductionDraft {
  key: string;
  name: string;
  amount: string;
  treatment: DeductionTreatment;
  isSharedBenefit: boolean;
}

/** Everything the paycheck section of an income form needs to hold. */
export interface PaycheckFormState {
  filingStatus: FilingStatus;
  stateTaxRate: string;
  additionalWithholding: string;
  netPayOverride: string;
  maxContributionPct: string;
  deductions: DeductionDraft[];
}

/** Matches the money input pattern used elsewhere in the app, plus a leading
 *  minus: a pay stub can carry a pre-tax credit that nets against the rest. */
const MONEY_PATTERN = /^-?\d*\.?\d{0,2}$/;
const RATE_PATTERN = /^\d*\.?\d{0,3}$/;

let rowCounter = 0;
function nextRowKey(): string {
  rowCounter += 1;
  return `deduction-${rowCounter}`;
}

export const emptyPaycheckForm: PaycheckFormState = {
  filingStatus: 'single',
  stateTaxRate: '',
  additionalWithholding: '',
  netPayOverride: '',
  maxContributionPct: '80',
  deductions: [],
};

export function paycheckFormFromRule(rule: {
  filingStatus?: string | null;
  stateTaxRate?: number | null;
  additionalWithholding?: number | null;
  netPayOverride?: number | null;
  maxContributionPct?: number | null;
  deductions?: PaycheckDeduction[];
}): PaycheckFormState {
  return {
    filingStatus: (rule.filingStatus as FilingStatus) || 'single',
    stateTaxRate: rule.stateTaxRate != null ? String(rule.stateTaxRate) : '',
    additionalWithholding: rule.additionalWithholding ? String(rule.additionalWithholding) : '',
    netPayOverride: rule.netPayOverride != null ? String(rule.netPayOverride) : '',
    maxContributionPct: String(Math.round((rule.maxContributionPct ?? 0.8) * 100)),
    deductions: (rule.deductions ?? []).map((d) => ({
      key: nextRowKey(),
      name: d.name,
      amount: String(d.amount),
      treatment: d.treatment,
      isSharedBenefit: d.isSharedBenefit,
    })),
  };
}

/** Turns the form state into the payload the income-rules API expects. */
export function paycheckFormToPayload(form: PaycheckFormState) {
  return {
    filingStatus: form.filingStatus,
    stateTaxRate: parseNumber(form.stateTaxRate, 0),
    additionalWithholding: parseNumber(form.additionalWithholding, 0),
    netPayOverride: isBlank(form.netPayOverride) ? null : parseNumber(form.netPayOverride, 0),
    maxContributionPct: ceilingFraction(form.maxContributionPct),
    deductions: namedDeductions(form.deductions).map((d) => ({
      name: d.name.trim(),
      amount: parseNumber(d.amount, 0),
      treatment: d.treatment,
      isSharedBenefit: d.isSharedBenefit,
    })),
  };
}

/** Rows that are complete enough to count. A row being typed has no name yet. */
function namedDeductions(deductions: DeductionDraft[]): DeductionDraft[] {
  return deductions.filter((d) => d.name.trim() !== '');
}

function isBlank(value: string): boolean {
  return value.trim() === '';
}

function parseNumber(value: string, fallback: number): number {
  const parsed = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** The ceiling as a fraction. Left at the default when the field is empty so a
 *  half-typed value never silently becomes 1%. */
function ceilingFraction(raw: string): number {
  if (isBlank(raw)) return 0.8;
  const pct = parseNumber(raw, 80);
  return Math.min(1, Math.max(0.01, pct / 100));
}

interface Props {
  annualSalary: number;
  payFrequency: string;
  value: PaycheckFormState;
  onChange: (next: PaycheckFormState) => void;
}

/**
 * The payroll half of an income source: filing details, the deductions that
 * come out before the money lands, and the ceiling on what this paycheck can
 * be asked to contribute.
 *
 * The preview runs the same estimator the server uses, so the take-home figure
 * shown here is the one the contribution guard will enforce.
 */
export function PaycheckFields({ annualSalary, payFrequency, value, onChange }: Props) {
  // This block is mounted in two different dialogs, so ids have to be unique
  // per instance rather than hard-coded.
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${name}`;

  const set = <K extends keyof PaycheckFormState>(key: K, next: PaycheckFormState[K]) =>
    onChange({ ...value, [key]: next });

  const payload = paycheckFormToPayload(value);
  const breakdown = estimatePaycheck({
    annualSalary: annualSalary || 0,
    payFrequency,
    filingStatus: value.filingStatus,
    stateTaxRate: payload.stateTaxRate,
    additionalWithholding: payload.additionalWithholding,
    netPayOverride: payload.netPayOverride,
    deductions: payload.deductions,
  });

  const ceiling = breakdown.net * payload.maxContributionPct;
  const unnamedRows = value.deductions.length - namedDeductions(value.deductions).length;

  function addDeduction() {
    set('deductions', [
      ...value.deductions,
      {
        key: nextRowKey(),
        name: '',
        amount: '',
        treatment: 'pre_tax_section_125',
        isSharedBenefit: false,
      },
    ]);
  }

  function updateDeduction(key: string, patch: Partial<DeductionDraft>) {
    set(
      'deductions',
      value.deductions.map((d) => (d.key === key ? { ...d, ...patch } : d))
    );
  }

  function removeDeduction(key: string) {
    set(
      'deductions',
      value.deductions.filter((d) => d.key !== key)
    );
  }

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div>
        <h4 className="form-section__title">Taxes and withholding</h4>
        <p className="hint">
          Used to estimate take-home pay. A contribution can only be paid out of what actually lands
          in the bank.
        </p>
      </div>

      <div className="settings-grid">
        <div>
          <Label.Root htmlFor={fieldId('filing')} className="label">
            Filing status
          </Label.Root>
          <select
            id={fieldId('filing')}
            value={value.filingStatus}
            onChange={(e) => set('filingStatus', e.target.value as FilingStatus)}
            className="select"
          >
            {(Object.keys(FILING_STATUS_LABELS) as FilingStatus[]).map((status) => (
              <option key={status} value={status}>
                {FILING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label.Root htmlFor={fieldId('state')} className="label">
            State
          </Label.Root>
          <select
            id={fieldId('state')}
            value={matchingStateCode(value.stateTaxRate)}
            onChange={(e) => {
              if (e.target.value === 'other') return;
              set('stateTaxRate', String(FLAT_STATE_RATES[e.target.value]));
            }}
            className="select"
          >
            <option value="other">Other — enter a rate</option>
            {Object.keys(FLAT_STATE_RATES)
              .sort()
              .map((code) => (
                <option key={code} value={code}>
                  {code} — {FLAT_STATE_RATES[code]}%
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label.Root htmlFor={fieldId('rate')} className="label">
            State tax rate (%)
          </Label.Root>
          <input
            id={fieldId('rate')}
            type="text"
            inputMode="decimal"
            value={value.stateTaxRate}
            onChange={(e) => {
              if (e.target.value === '' || RATE_PATTERN.test(e.target.value)) {
                set('stateTaxRate', e.target.value);
              }
            }}
            className="input"
            placeholder="e.g. 4.45"
          />
          <p className="hint">States with graduated brackets need the rate from a pay stub.</p>
        </div>
        <div>
          <Label.Root htmlFor={fieldId('extra')} className="label">
            Extra withholding per check ($)
          </Label.Root>
          <input
            id={fieldId('extra')}
            type="text"
            inputMode="decimal"
            value={value.additionalWithholding}
            onChange={(e) => {
              if (e.target.value === '' || MONEY_PATTERN.test(e.target.value)) {
                set('additionalWithholding', e.target.value);
              }
            }}
            className="input"
            placeholder="0.00"
          />
        </div>
        <div>
          <Label.Root htmlFor={fieldId('net')} className="label">
            Actual net per check ($)
          </Label.Root>
          <input
            id={fieldId('net')}
            type="text"
            inputMode="decimal"
            value={value.netPayOverride}
            onChange={(e) => {
              if (e.target.value === '' || MONEY_PATTERN.test(e.target.value)) {
                set('netPayOverride', e.target.value);
              }
            }}
            className="input"
            placeholder="optional"
          />
          <p className="hint">From a pay stub. Overrides the estimate below.</p>
        </div>
        <div>
          <Label.Root htmlFor={fieldId('ceiling')} className="label">
            Contribution ceiling (% of take-home)
          </Label.Root>
          <input
            id={fieldId('ceiling')}
            type="text"
            inputMode="decimal"
            value={value.maxContributionPct}
            onChange={(e) => {
              if (e.target.value === '' || RATE_PATTERN.test(e.target.value)) {
                set('maxContributionPct', e.target.value);
              }
            }}
            className="input"
            placeholder="80"
          />
          <p className="hint">
            {breakdown.net > 0
              ? `Contributions above ${formatMoney(ceiling)} a paycheck will be refused.`
              : 'Defaults to 80% when left empty.'}
          </p>
        </div>
      </div>

      <div>
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: '0.75rem' }}
        >
          <div>
            <h4 className="form-section__title">Paycheck deductions</h4>
            <p className="hint">
              Mark anything that covers the household as shared — it counts toward that
              person&apos;s contribution before any cash moves.
            </p>
          </div>
          <button type="button" onClick={addDeduction} className="btn btn-secondary btn-sm">
            <PlusIcon size={14} /> Add
          </button>
        </div>

        {value.deductions.length > 0 && (
          <div className="stack" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
            {value.deductions.map((deduction) => (
              <div key={deduction.key} className="deduction-row">
                <input
                  type="text"
                  value={deduction.name}
                  onChange={(e) => updateDeduction(deduction.key, { name: e.target.value })}
                  className="input deduction-row__name"
                  placeholder="Medical insurance"
                  aria-label="Deduction name"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={deduction.amount}
                  onChange={(e) => {
                    if (e.target.value === '' || MONEY_PATTERN.test(e.target.value)) {
                      updateDeduction(deduction.key, { amount: e.target.value });
                    }
                  }}
                  className="input deduction-row__amount"
                  placeholder="0.00"
                  aria-label="Deduction amount per paycheck"
                />
                <select
                  value={deduction.treatment}
                  onChange={(e) =>
                    updateDeduction(deduction.key, {
                      treatment: e.target.value as DeductionTreatment,
                    })
                  }
                  className="select deduction-row__treatment"
                  aria-label="Tax treatment"
                >
                  {(Object.keys(DEDUCTION_TREATMENT_LABELS) as DeductionTreatment[]).map((t) => (
                    <option key={t} value={t}>
                      {DEDUCTION_TREATMENT_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label className="deduction-row__shared">
                  <input
                    type="checkbox"
                    checked={deduction.isSharedBenefit}
                    onChange={(e) =>
                      updateDeduction(deduction.key, { isSharedBenefit: e.target.checked })
                    }
                  />
                  Household benefit
                </label>
                <button
                  type="button"
                  onClick={() => removeDeduction(deduction.key)}
                  className="btn btn-ghost btn-sm deduction-row__remove"
                  aria-label={`Remove ${deduction.name || 'unnamed deduction'}`}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {unnamedRows > 0 && (
          <p className="hint" style={{ marginTop: '0.5rem' }}>
            {unnamedRows === 1 ? 'One deduction still needs' : `${unnamedRows} deductions still need`}{' '}
            a name. Unnamed rows are not counted.
          </p>
        )}
      </div>

      <PaycheckPreview
        breakdown={breakdown}
        ceiling={ceiling}
        hasSalary={(annualSalary || 0) > 0}
      />
    </div>
  );
}

/** The state whose flat rate matches what is typed, for the convenience picker. */
function matchingStateCode(rate: string): string {
  if (isBlank(rate)) return 'other';
  const value = parseNumber(rate, NaN);
  const match = Object.keys(FLAT_STATE_RATES)
    .sort()
    .find((code) => FLAT_STATE_RATES[code] === value);
  return match ?? 'other';
}

function PaycheckPreview({
  breakdown,
  ceiling,
  hasSalary,
}: {
  breakdown: ReturnType<typeof estimatePaycheck>;
  ceiling: number;
  hasSalary: boolean;
}) {
  if (!hasSalary) {
    return (
      <div className="stat-tile">
        <div className="stat-tile__label">Paycheck</div>
        <p className="hint" style={{ margin: 0 }}>
          Enter an annual salary to see what each paycheck actually deposits.
        </p>
      </div>
    );
  }

  // Taxes are itemised because this table gets checked line by line against a
  // real pay stub, and stubs itemise them.
  const rows: Array<[string, number]> = [
    ['Gross per check', breakdown.gross],
    ['Pre-tax deductions', -breakdown.preTaxDeductions],
    ['Social Security', -breakdown.oasdi],
    ['Medicare', -breakdown.medicare],
    ['Federal withholding', -breakdown.federalWithholding],
    ['State withholding', -breakdown.stateWithholding],
    ['Post-tax deductions', -breakdown.postTaxDeductions],
  ];

  return (
    <div className="stat-tile">
      <div className="stat-tile__label">
        {breakdown.isEstimate ? 'Estimated paycheck' : 'Paycheck (net from your stub)'}
      </div>
      <table className="table" style={{ marginTop: '0.35rem' }}>
        <tbody>
          {rows.map(([label, amount]) => (
            <tr key={label}>
              <td style={{ color: 'var(--text-secondary)' }}>{label}</td>
              <td className="num">{formatMoney(amount)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: 700 }}>Lands in the bank</td>
            <td className="num" style={{ fontWeight: 700 }}>
              {formatMoney(breakdown.net)}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="stat-tile__sub">
        {/* With an override the rows above are still the estimate, so say which
            number won rather than showing a column that does not add up. */}
        {breakdown.isEstimate ? (
          <>{Math.round(breakdown.effectiveNetRate * 100)}% of gross.</>
        ) : (
          <>
            Using your stub figure. The estimate above would have come to{' '}
            {formatMoney(
              breakdown.gross -
                breakdown.preTaxDeductions -
                breakdown.totalTaxes -
                breakdown.postTaxDeductions
            )}
            .
          </>
        )}{' '}
        Most this paycheck can contribute: <strong>{formatMoney(ceiling)}</strong>.
        {breakdown.sharedBenefitDeductions > 0 && (
          <> {formatMoney(breakdown.sharedBenefitDeductions)} a check buys household benefits.</>
        )}
      </div>
    </div>
  );
}
