'use client';
import { useState } from 'react';
const inputClass = 'mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-ink-900';
export default function SearchDates({ mode: initialMode, dates, today, lastDate }) {
  const [mode, setMode] = useState(initialMode);
  return <>
    <label>Date mode<select aria-label="Date mode" name="mode" value={mode} onChange={event => setMode(event.target.value)} className={inputClass}><option value="single">Single visit</option><option value="consecutive">Consecutive visits</option><option value="separate">Separate dates</option></select></label>
    {mode === 'separate' ? <label>Visit dates<input name="dates" defaultValue={dates.join(',')} placeholder="YYYY-MM-DD,YYYY-MM-DD" className={inputClass} aria-describedby="search-dates-help" maxLength={109} /></label> : <>
      <label>{mode === 'single' ? 'Visit date' : 'First visit date'}<input type="date" name="date" defaultValue={dates[0] || ''} min={today} max={lastDate} className={inputClass} /></label>
      {mode === 'consecutive' && <label>Last visit date<input type="date" name="end" defaultValue={dates.at(-1) || ''} min={today} max={lastDate} className={inputClass} /></label>}
    </>}
  </>;
}
