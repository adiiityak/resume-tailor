"use client";

import { useState } from "react";

const FILTER_FIELDS = ["from", "to", "company", "role", "location", "source"];

const emptyFilters = () => Object.fromEntries(FILTER_FIELDS.map((field) => [field, ""]));

function normalizedFilters(filters) {
  return { ...emptyFilters(), ...Object.fromEntries(FILTER_FIELDS.map((field) => [field, filters?.[field] || ""])) };
}

const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";
const controlClass = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm ${focusClass}`;
const buttonClass = `min-h-11 rounded-lg px-4 py-2 text-sm font-medium shadow-sm disabled:cursor-wait disabled:opacity-60 ${focusClass}`;

function SelectField({ idPrefix, field, label, options, value, onChange }) {
  return (
    <div>
      <label htmlFor={`${idPrefix}-${field}`} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select id={`${idPrefix}-${field}`} name={field} value={value} onChange={onChange} className={controlClass}>
        <option value="">All {label.toLowerCase() === "company" ? "companies" : `${label.toLowerCase()}s`}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function FilterForm({ idPrefix, draft, onChange, onSubmit, onClear, options, refreshing }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label="Analytics filters">
      <div>
        <label htmlFor={`${idPrefix}-from`} className="mb-1 block text-sm font-medium text-slate-700">From date</label>
        <input id={`${idPrefix}-from`} type="date" value={draft.from} onChange={onChange} name="from" className={controlClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-to`} className="mb-1 block text-sm font-medium text-slate-700">To date</label>
        <input id={`${idPrefix}-to`} type="date" value={draft.to} onChange={onChange} name="to" className={controlClass} />
      </div>
      <SelectField idPrefix={idPrefix} field="company" label="Company" options={options.companies || []} value={draft.company} onChange={onChange} />
      <SelectField idPrefix={idPrefix} field="role" label="Role" options={options.roles || []} value={draft.role} onChange={onChange} />
      <SelectField idPrefix={idPrefix} field="location" label="Location" options={options.locations || []} value={draft.location} onChange={onChange} />
      <SelectField idPrefix={idPrefix} field="source" label="Source" options={options.sources || []} value={draft.source} onChange={onChange} />
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <button type="submit" disabled={refreshing} className={`${buttonClass} bg-blue-700 text-white hover:bg-blue-800`}>
          {refreshing ? "Applying…" : "Apply filters"}
        </button>
        <button type="button" onClick={onClear} disabled={refreshing} className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
          Clear filters
        </button>
      </div>
    </form>
  );
}

function AnalyticsFiltersForm({ filters, options, refreshing, onApply, onClear }) {
  const [draftState, setDraftState] = useState(() => ({ filters, values: normalizedFilters(filters) }));

  if (filters !== draftState.filters) {
    setDraftState({ filters, values: normalizedFilters(filters) });
  }

  const draft = draftState.values;

  function handleChange(event) {
    const { name, value } = event.target;
    setDraftState((current) => ({ ...current, values: { ...current.values, [name]: value } }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onApply(draft);
  }

  function handleClear() {
    setDraftState((current) => ({ ...current, values: emptyFilters() }));
    onClear();
  }

  const formProps = { draft, onChange: handleChange, onSubmit: handleSubmit, onClear: handleClear, options: options || {}, refreshing };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="analytics-filters-title">
      <h2 id="analytics-filters-title" className="text-base font-semibold text-slate-900">Filter metrics</h2>
      <details className="mt-3 lg:hidden">
        <summary className={`min-h-11 cursor-pointer py-3 text-sm font-medium text-blue-700 ${focusClass}`}>Show filters</summary>
        <div className="mt-4"><FilterForm idPrefix="mobile" {...formProps} /></div>
      </details>
      <div className="mt-4 hidden lg:block"><FilterForm idPrefix="desktop" {...formProps} /></div>
    </section>
  );
}

export default function AnalyticsFilters({ filters, options, refreshing, onApply, onClear }) {
  return <AnalyticsFiltersForm filters={filters} options={options} refreshing={refreshing} onApply={onApply} onClear={onClear} />;
}
