'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Building2, Loader2, MapPin, ShieldCheck, X,
} from 'lucide-react';
import { createListingFromBasics } from '@/lib/auth/listings';
import { RentraLogo } from '@/components/rentra/Logo';
import { Input } from '@/components/ui/input';
import { STEP_FORM_ID } from './chrome';
import { ChapterBar, MobileStepDisclosure, StepRail } from './WizardProgress';

const controlClass = 'min-h-12 w-full rounded-md border border-input bg-card px-3.5 py-3 text-meta '
  + 'text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none';

function Field({ id, label, hint, error, optional = false, children }) {
  const descriptionId = `${id}-description`;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-meta font-semibold text-ink-800">{label}</label>
        {optional ? <span className="text-tiny text-ink-400">Optional</span> : null}
      </div>
      {children}
      <p
        id={descriptionId}
        className={`mt-1.5 text-tiny ${error ? 'font-medium text-danger' : 'text-ink-500'}`}
      >
        {error ?? hint}
      </p>
    </div>
  );
}

export default function NewListingStart({ categories, cities, progress }) {
  const [state, action, pending] = useActionState(createListingFromBasics, {});
  const [cityId, setCityId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const errors = state.errors ?? {};

  const areas = useMemo(
    () => cities.find((item) => item.id === cityId)?.areas ?? [],
    [cities, cityId],
  );
  const ready = categories.length > 0 && cities.some((item) => item.areas.length > 0);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-30 shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
          <RentraLogo className="h-6 w-auto shrink-0" />
          <span className="hidden h-4 w-px shrink-0 bg-ink-200 sm:block" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-tiny font-bold tracking-wider text-brand-700 uppercase">
            {progress.chapterLabel}
            <span className="ml-2 hidden font-medium tracking-normal text-ink-400 normal-case sm:inline">
              Chapter {progress.chapterNumber} of {progress.chapterTotal}
            </span>
            <span className="ml-2 font-medium tracking-normal text-ink-400 normal-case sm:hidden">
              Step {progress.stepNumber} of {progress.stepTotal}
            </span>
          </p>
          <p className="hidden shrink-0 text-tiny text-ink-500 tabular md:block">
            Step {progress.stepNumber} of {progress.stepTotal} · ~{progress.minutesLeft} min
          </p>
          <Link
            href="/partner/listings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-tiny font-semibold text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Cancel</span>
          </Link>
        </div>
        <nav aria-label="Property setup progress">
          <ChapterBar chapters={progress.chapters} />
        </nav>
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        aria-label="Start a new property"
      >
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 pt-5 pb-16 sm:px-6 sm:pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8">
          <StepRail progress={progress} />

          <div className="min-w-0 animate-in duration-500 fade-in slide-in-from-bottom-4">
            <MobileStepDisclosure progress={progress} />
            <form id={STEP_FORM_ID} action={action}>
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs sm:p-8 lg:p-10">
                <p className="text-tiny font-bold tracking-[0.12em] text-brand-700 uppercase">
                  Property setup · Step 1
                </p>
                <h1 className="mt-2 text-h1">Tell us about your place</h1>
                <p className="mt-2 max-w-2xl text-body text-ink-600">
                  Start with the details guests use to recognise it. Your property is created only
                  after this step is complete.
                </p>

                {errors._ ? (
                  <p className="mt-5 rounded-md border-l-4 border-danger bg-danger-bg p-3 text-meta text-danger">
                    {errors._}
                  </p>
                ) : null}

                {!ready ? (
                  <p className="mt-5 rounded-md border-l-4 border-amber-500 bg-warning-bg p-3 text-meta text-warning">
                    Property categories and service areas are not available yet. Ask a Rentra admin
                    to finish marketplace setup before adding a property.
                  </p>
                ) : null}

                <section className="mt-8" aria-labelledby="identity-heading">
                  <div className="flex items-start gap-3 border-b border-border pb-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                      <Building2 className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 id="identity-heading" className="text-h4 font-bold text-ink-900">Property identity</h2>
                      <p className="mt-0.5 text-tiny text-ink-500">What it is and why a guest would choose it.</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    <Field id="categoryId" label="Category" hint="Choose the closest type of property." error={errors.categoryId}>
                      <select
                        id="categoryId"
                        name="categoryId"
                        defaultValue=""
                        required
                        aria-invalid={Boolean(errors.categoryId)}
                        aria-describedby="categoryId-description"
                        className={controlClass}
                      >
                        <option value="" disabled>Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      id="title"
                      label="Property title"
                      hint={`${title.length}/90 · “Riverside farm with private pool” is clear and specific.`}
                      error={errors.title}
                    >
                      <Input
                        id="title"
                        name="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                        minLength={8}
                        maxLength={90}
                        autoComplete="off"
                        placeholder="Riverside farm with private pool"
                        aria-invalid={Boolean(errors.title)}
                        aria-describedby="title-description"
                        className={controlClass}
                      />
                    </Field>

                    <Field
                      id="highlight"
                      label="One-line highlight"
                      hint="A short benefit shown on property cards."
                      error={errors.highlight}
                      optional
                    >
                      <Input
                        id="highlight"
                        name="highlight"
                        maxLength={60}
                        autoComplete="off"
                        placeholder="Private pool · 25 minutes from Surat"
                        aria-invalid={Boolean(errors.highlight)}
                        aria-describedby="highlight-description"
                        className={controlClass}
                      />
                    </Field>

                    <Field
                      id="description"
                      label="Description"
                      hint={`${description.length}/40 minimum · Describe the setting, best features, and nearby landmarks.`}
                      error={errors.description}
                    >
                      <textarea
                        id="description"
                        name="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        required
                        minLength={40}
                        maxLength={4000}
                        rows={6}
                        placeholder="Tell guests what a day at your property feels like…"
                        aria-invalid={Boolean(errors.description)}
                        aria-describedby="description-description"
                        className={controlClass}
                      />
                    </Field>
                  </div>
                </section>

                <section className="mt-9" aria-labelledby="area-heading">
                  <div className="flex items-start gap-3 border-b border-border pb-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                      <MapPin className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 id="area-heading" className="text-h4 font-bold text-ink-900">General area</h2>
                      <p className="mt-0.5 text-tiny text-ink-500">The next step asks for the exact address and map pin.</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field id="cityId" label="City" hint="Where guests will search." error={errors.cityId}>
                      <select
                        id="cityId"
                        name="cityId"
                        value={cityId}
                        onChange={(event) => {
                          setCityId(event.target.value);
                          setAreaId('');
                        }}
                        required
                        aria-invalid={Boolean(errors.cityId)}
                        aria-describedby="cityId-description"
                        className={controlClass}
                      >
                        <option value="" disabled>Select a city</option>
                        {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                      </select>
                    </Field>

                    <Field id="areaId" label="Area" hint="Must belong to the selected city." error={errors.areaId}>
                      <select
                        id="areaId"
                        name="areaId"
                        value={areaId}
                        onChange={(event) => setAreaId(event.target.value)}
                        required
                        disabled={!cityId}
                        aria-invalid={Boolean(errors.areaId)}
                        aria-describedby="areaId-description"
                        className={`${controlClass} disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400`}
                      >
                        <option value="" disabled>{cityId ? 'Select an area' : 'Choose a city first'}</option>
                        {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                      </select>
                    </Field>
                  </div>
                </section>

                <div className="mt-8 flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 p-4">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <p className="text-tiny leading-5 text-brand-900">
                    <strong className="font-bold">No blank drafts.</strong> Leaving this page creates
                    nothing. After a valid Continue, these details are saved and you move to the exact
                    location step.
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer
        data-wizard-actions
        className="z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur"
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-6 lg:pl-[300px] lg:pr-8">
          <Link
            href="/partner/listings"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2.5 text-meta font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Properties</span>
          </Link>
          <p className="hidden text-tiny text-ink-400 sm:block">Nothing is created until this step is valid</p>
          <button
            type="submit"
            form={STEP_FORM_ID}
            disabled={pending || !ready}
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-meta font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? 'Creating your property…' : 'Continue'}
            {!pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </button>
        </div>
      </footer>
    </div>
  );
}
