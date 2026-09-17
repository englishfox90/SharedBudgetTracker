'use client';

import * as Label from '@radix-ui/react-label';
import { estimatePaycheck, DEDUCTION_TREATMENT_LABELS, DeductionTreatment } from '@/lib/paycheck';
import { FILING_STATUS_LABELS, FilingStatus, FLAT_STATE_RATES } from '@/lib/tax-tables';
import { PaycheckDeduction } from '@/types';
import { formatMoney } from '@/lib/actualize';
import { PlusIcon, TrashIcon } from '../icons';

/** Everything the paycheck section of an income form needs to hold. */
export interface PaycheckFormState {
  filingStatus: FilingStatus;
  stateTaxRate: string;
  additionalWithholding: string;
  netPayOverride: string;
  maxContributionPct: string;
  deductions: PaycheckDeduction[];
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
      name: d.name,
      amount: d.amount,
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
    netPayOverride: form.netPayOverride.trim() === '' ? null : parseNumber(form.netPayOverride, 0),
    maxContributionPct: Math.min(1, Math.max(0.01, parseNumber(form.maxContributionPct, 80) / 100)),
    deductions: form.deductions
      .filter((d) => d.name.trim() !== '')
      .map((d) => ({
        name: d.name.trim(),
        amount: Number(d.amount) || 0,
        treatment: d.treatment,
        isSharedBenefit: d.isSharedBenefit,
      })),
  };
}

function parseNumber(value: string, fallback: number): number {
  const parsed = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
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

  function addDeduction() {
    set('deductions', [
      ...value.deductions,
      { name: '', amount: 0, treatment: 'pre_tax_section_125', isSharedBenefit: false },
    ]);
  }

  function updateDeduction(index: number, patch: Partial<PaycheckDeduction>) {
    set(
      'deductions',
      value.deductions.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  function removeDeduction(index: number) {
    set(
      'deductions',
      value.deductions.filter((_, i) => i !== index)
    );
  }

  return (
    <div className="stack" style={{ gap: '1rem' }}>
      <div>
        <h4 style={{ fontSize: 'var(--font-small)', fontWeight: 600, marginBottom: '0.25rem' }}>
          Taxes and withholding
        </h4>
        <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', margin: 0 }}>
          Used to estimate take-home pay. A contribution can only be paid out of what actually lands
          in the bank.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <Label.Root className="label">Filing status</Label.Root>
          <select
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
          <Label.Root className="label">State tax rate (%)</Label.Root>
          <input
            type="text"
            inputMode="decimal"
            value={value.stateTaxRate}
            onChange={(e) => set('stateTaxRate', e.target.value)}
            className="input"
            placeholder="e.g. 4.45"
            list="flat-state-rates"
          />
          <datalist id="flat-state-rates">
            {Object.entries(FLAT_STATE_RATES).map(([code, rate]) => (
              <option key={code} value={rate}>
                {code}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <Label.Root className="label">Extra withholding per check ($)</Label.Root>
          <input
            type="text"
            inputMode="decimal"
            value={value.additionalWithholding}
            onChange={(e) => set('additionalWithholding', e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </div>
        <div>
          <Label.Root className="label">Actual net per check ($)</Label.Root>
          <input
            type="text"
            inputMode="decimal"
            value={value.netPayOverride}
            onChange={(e) => set('netPayOverride', e.target.value)}
            className="input"
            placeholder="from a pay stub — optional"
          />
        </div>
      </div>

      <div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div>
            <h4 style={{ fontSize: 'var(--font-small)', fontWeight: 600, marginBottom: '0.25rem' }}>
              Paycheck deductions
            </h4>
            <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', margin: 0 }}>
              Mark anything that covers the household as shared — it counts toward that person&apos;s
              contribution before any cash moves.
            </p>
          </div>
          <button type="button" onClick={addDeduction} className="btn btn-secondary btn-sm">
            <PlusIcon size={14} /> Add
          </button>
        </div>

        {value.deductions.length > 0 && (
          <div className="stack" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
            {value.deductions.map((deduction, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) 92px minmax(0, 1.3fr) auto auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={deduction.name}
                  onChange={(e) => updateDeduction(index, { name: e.target.value })}
                  className="input"
                  placeholder="Medical insurance"
                  aria-label="Deduction name"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={String(deduction.amount)}
                  onChange={(e) =>
                    updateDeduction(index, { amount: parseNumber(e.target.value, 0) })
                  }
                  className="input"
                  placeholder="0.00"
                  aria-label="Deduction amount per paycheck"
                />
                <select
                  value={deduction.treatment}
                  onChange={(e) =>
                    updateDeduction(index, { treatment: e.target.value as DeductionTreatment })
                  }
                  className="select"
                  aria-label="Tax treatment"
                >
                  {(Object.keys(DEDUCTION_TREATMENT_LABELS) as DeductionTreatment[]).map((t) => (
                    <option key={t} value={t}>
                      {DEDUCTION_TREATMENT_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: 'var(--font-small)',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={deduction.isSharedBenefit}
                    onChange={(e) => updateDeduction(index, { isSharedBenefit: e.target.checked })}
                  />
                  Shared
                </label>
                <button
                  type="button"
                  onClick={() => removeDeduction(index)}
                  className="btn btn-ghost btn-sm"
                  aria-label={`Remove ${deduction.name || 'deduction'}`}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label.Root className="label">Contribution ceiling (% of take-home)</Label.Root>
        <input
          type="text"
          inputMode="decimal"
          value={value.maxContributionPct}
          onChange={(e) => set('maxContributionPct', e.target.value)}
          className="input"
          placeholder="80"
        />
        <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
          The app will refuse to set a contribution above {formatMoney(ceiling)} a paycheck.
        </p>
      </div>

      <PaycheckPreview breakdown={breakdown} ceiling={ceiling} />
    </div>
  );
}

function PaycheckPreview({
  breakdown,
  ceiling,
}: {
  breakdown: ReturnType<typeof estimatePaycheck>;
  ceiling: number;
}) {
  const rows: Array<[string, number, boolean?]> = [
    ['Gross per check', breakdown.gross],
    ['Pre-tax deductions', -breakdown.preTaxDeductions],
    ['Taxes withheld', -breakdown.totalTaxes],
    ['Post-tax deductions', -breakdown.postTaxDeductions],
  ];

  return (
    <div className="stat-tile" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="stat-tile__label">
        {breakdown.isEstimate ? 'Estimated paycheck' : 'Paycheck (from your stub)'}
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
        {Math.round(breakdown.effectiveNetRate * 100)}% of gross. Most this paycheck can contribute:{' '}
        <strong>{formatMoney(ceiling)}</strong>.
        {breakdown.sharedBenefitDeductions > 0 && (
          <>
            {' '}
            {formatMoney(breakdown.sharedBenefitDeductions)} a check already buys shared benefits.
          </>
        )}
      </div>
    </div>
  );
}
