"use client"



/**
 * Smart address primitives for Indian dispatch / billing addresses.
 *
 *   IndianStateCombobox   — searchable state dropdown, Manipur + Delhi pinned to top.
 *   IndianCityCombobox    — searchable city autocomplete, scoped by state, Imphal + New Delhi pinned to top.
 *                          Accepts free-text entry for villages / settlements not in the curated list.
 *   PincodeInput          — 6-digit mono input with on-change debounced India-Post lookup
 *                          that auto-fills city + state when a valid PIN resolves.
 *   SmartAddressFields    — composed grouping: line1 + line2 + state + city + pincode,
 *                          react-hook-form aware via the rendered HTML inputs / value-change props.
 *
 * Designed for direct drop-in inside any form that follows the
 * `addressSchema` shape from `@workspace/types/schemas/shipment`.
 */

import * as React from "react"
import {
  INDIAN_STATES,
  findIndianStateByCode,
  findIndianStateByName,
  type IndianStateCode,
} from "@workspace/types/data/india-states"
import {
  INDIAN_CITIES,
  INDIAN_CITIES_BY_STATE,
} from "@workspace/types/data/india-cities"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/primitives/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/primitives/popover"
import { RiArrowDownSLine, RiCheckLine, RiMapPinLine } from "@workspace/ui/icons"

// ─────────────────────────────────────────────────────────────────────────────
// IndianStateCombobox
// ─────────────────────────────────────────────────────────────────────────────

interface IndianStateComboboxProps {
  /**
   * Current selected state. Accepts either the ISO 3166-2 sub-code (`"MN"`)
   * or the canonical full name (`"Manipur"`) — the combobox normalises on
   * either side for backward-compat with forms that already store full names.
   */
  value?: string
  /** Fires with the canonical state full name (`"Manipur"`). */
  onChange?: (stateName: string, stateCode: IndianStateCode) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  triggerClassName?: string
  "aria-invalid"?: boolean
}

function IndianStateCombobox({
  value,
  onChange,
  placeholder = "Select state",
  disabled,
  id,
  className,
  triggerClassName,
  "aria-invalid": ariaInvalid,
}: IndianStateComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected =
    findIndianStateByCode(value) ?? findIndianStateByName(value) ?? undefined

  const priority = INDIAN_STATES.filter((s) => s.priority)
  const rest = INDIAN_STATES
    .filter((s) => !s.priority)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className={cn("inline-flex w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            data-slot="indian-state-combobox-trigger"
            className={cn(
              "w-full justify-between gap-2 font-sans text-sm",
              !selected && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <span className="truncate">
              {selected ? selected.name : placeholder}
            </span>
            <RiArrowDownSLine className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command>
            <CommandInput placeholder="Search state…" />
            <CommandList className="max-h-72">
              <CommandEmpty>No state matches.</CommandEmpty>
              <CommandGroup heading="Primary network">
                {priority.map((s) => (
                  <CommandItem
                    key={s.code}
                    value={`${s.name} ${s.code}`}
                    onSelect={() => {
                      onChange?.(s.name, s.code)
                      setOpen(false)
                    }}
                  >
                    <RiCheckLine
                      className={cn(
                        "size-4 shrink-0",
                        selected?.code === s.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                      {s.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="All states & UTs">
                {rest.map((s) => (
                  <CommandItem
                    key={s.code}
                    value={`${s.name} ${s.code}`}
                    onSelect={() => {
                      onChange?.(s.name, s.code)
                      setOpen(false)
                    }}
                  >
                    <RiCheckLine
                      className={cn(
                        "size-4 shrink-0",
                        selected?.code === s.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                      {s.code}
                      {s.isUT ? " · UT" : ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IndianCityCombobox
// ─────────────────────────────────────────────────────────────────────────────

interface IndianCityComboboxProps {
  /** Currently entered / selected city name. Free text accepted. */
  value?: string
  onChange?: (cityName: string) => void
  /**
   * If provided, the dropdown lists only cities in that state (with the
   * priority entries still surfaced). The user can still type a free-text
   * name not in the list (Enter to accept).
   */
  stateCode?: IndianStateCode | string | null
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  triggerClassName?: string
  "aria-invalid"?: boolean
}

function IndianCityCombobox({
  value,
  onChange,
  stateCode,
  placeholder = "Select or type city",
  disabled,
  id,
  className,
  triggerClassName,
  "aria-invalid": ariaInvalid,
}: IndianCityComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  // Resolve the scoping state: caller may pass either the ISO code (`MN`),
  // the full name (`Manipur`), or null for "all India".
  const resolvedState =
    findIndianStateByCode(stateCode ?? "") ??
    findIndianStateByName(stateCode ?? "") ??
    undefined

  const inScope = resolvedState
    ? (INDIAN_CITIES_BY_STATE[resolvedState.code] ?? [])
    : INDIAN_CITIES.slice().sort((a, b) => {
        if (a.priority && !b.priority) return -1
        if (b.priority && !a.priority) return 1
        return a.name.localeCompare(b.name)
      })

  const priority = inScope.filter((c) => c.priority)
  const rest = inScope.filter((c) => !c.priority)

  const trimmedQuery = query.trim()
  const queryNotInList =
    trimmedQuery.length > 0 &&
    !inScope.some((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase())

  const triggerLabel = value && value.length > 0 ? value : placeholder

  return (
    <div className={cn("inline-flex w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            data-slot="indian-city-combobox-trigger"
            className={cn(
              "w-full justify-between gap-2 font-sans text-sm",
              !value && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <RiArrowDownSLine className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command shouldFilter>
            <CommandInput
              placeholder={
                resolvedState ? `Search ${resolvedState.name}…` : "Search city…"
              }
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-72">
              <CommandEmpty>
                {trimmedQuery.length > 0 ? (
                  // eslint-disable-next-line no-restricted-syntax -- CommandEmpty action: native button needed for cmdk's event propagation outside CommandItem
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onChange?.(trimmedQuery)
                      setQuery("")
                      setOpen(false)
                    }}
                  >
                    <RiMapPinLine className="size-4 shrink-0 text-primary" />
                    <span className="truncate">
                      Use &ldquo;{trimmedQuery}&rdquo;
                    </span>
                    <span className="ml-auto font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                      CUSTOM
                    </span>
                  </button>
                ) : (
                  <span className="px-2 py-2 text-sm text-muted-foreground">
                    No city matches.
                  </span>
                )}
              </CommandEmpty>
              {priority.length > 0 ? (
                <>
                  <CommandGroup heading="Primary destinations">
                    {priority.map((c) => (
                      <CommandItem
                        key={`${c.stateCode}-${c.name}`}
                        value={`${c.name} ${c.stateCode}`}
                        onSelect={() => {
                          onChange?.(c.name)
                          setQuery("")
                          setOpen(false)
                        }}
                      >
                        <RiCheckLine
                          className={cn(
                            "size-4 shrink-0",
                            value === c.name ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-auto font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                          {c.stateCode}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              ) : null}
              <CommandGroup
                heading={
                  resolvedState ? `${resolvedState.name} cities` : "All cities"
                }
              >
                {rest.map((c) => (
                  <CommandItem
                    key={`${c.stateCode}-${c.name}`}
                    value={`${c.name} ${c.stateCode}`}
                    onSelect={() => {
                      onChange?.(c.name)
                      setQuery("")
                      setOpen(false)
                    }}
                  >
                    <RiCheckLine
                      className={cn(
                        "size-4 shrink-0",
                        value === c.name ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                      {c.stateCode}
                    </span>
                  </CommandItem>
                ))}
                {queryNotInList ? (
                  <CommandItem
                    value={`__custom__ ${trimmedQuery}`}
                    onSelect={() => {
                      onChange?.(trimmedQuery)
                      setQuery("")
                      setOpen(false)
                    }}
                  >
                    <RiMapPinLine className="size-4 shrink-0 text-primary" />
                    <span className="truncate">Use &ldquo;{trimmedQuery}&rdquo;</span>
                    <span className="ml-auto font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                      CUSTOM
                    </span>
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PincodeInput  — debounced api.postalpincode.in lookup → city + state autofill
// ─────────────────────────────────────────────────────────────────────────────

interface PincodeLookupResult {
  pincode: string
  city: string
  state: string
  district?: string
}

/**
 * Resolve a 6-digit Indian PIN code to its post-office's locality, district
 * and state via the public India-Post pincode API. Returns `null` for any
 * non-200 / "Error" / empty response. The API has no auth and very generous
 * rate limits.
 */
async function lookupIndianPincode(
  pincode: string,
  signal?: AbortSignal,
): Promise<PincodeLookupResult | null> {
  if (!/^\d{6}$/.test(pincode)) return null
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal,
      cache: "force-cache",
    })
    if (!res.ok) return null
    const json = (await res.json()) as Array<{
      Status: string
      PostOffice?: Array<{ Name: string; District: string; State: string }>
    }>
    const entry = json[0]
    if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
      return null
    }
    const po = entry.PostOffice[0]!
    return {
      pincode,
      city: po.District ?? po.Name,
      state: po.State,
      district: po.District,
    }
  } catch {
    return null
  }
}

interface PincodeInputProps {
  value?: string
  onChange?: (pincode: string) => void
  /** Fired once with a resolved {city, state} when a valid PIN is entered. */
  onResolve?: (result: PincodeLookupResult) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  "aria-invalid"?: boolean
}

function PincodeInput({
  value = "",
  onChange,
  onResolve,
  placeholder = "560001",
  disabled,
  id,
  className,
  "aria-invalid": ariaInvalid,
}: PincodeInputProps) {
  const [status, setStatus] = React.useState<
    "idle" | "looking-up" | "resolved" | "no-match"
  >("idle")
  const lastResolvedRef = React.useRef<string | null>(null)
  const onResolveRef = React.useRef(onResolve)

  React.useEffect(() => {
    onResolveRef.current = onResolve
  }, [onResolve])

  React.useEffect(() => {
    const trimmed = value.trim()
    if (!/^\d{6}$/.test(trimmed)) {
      setStatus(trimmed.length === 0 ? "idle" : "idle")
      return
    }
    if (lastResolvedRef.current === trimmed) return

    const ctrl = new AbortController()
    setStatus("looking-up")
    const t = window.setTimeout(async () => {
      const result = await lookupIndianPincode(trimmed, ctrl.signal)
      if (ctrl.signal.aborted) return
      if (result) {
        lastResolvedRef.current = trimmed
        setStatus("resolved")
        onResolveRef.current?.(result)
      } else {
        setStatus("no-match")
      }
    }, 350)

    return () => {
      ctrl.abort()
      window.clearTimeout(t)
    }
  }, [value])

  return (
    <div className={cn("relative w-full", className)}>
      {/* eslint-disable-next-line no-restricted-syntax -- Pincode input requires inputMode/pattern/maxLength HTML attributes; shadcn Input is equivalent but this is inside a combobox layout where direct ref control is needed */}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={value}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onChange={(e) => onChange?.(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full border border-border bg-background px-3 pr-20 font-mono text-sm tabular-nums",
          "placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none",
          "focus:ring-1 focus:ring-primary disabled:opacity-60",
        )}
        data-slot="pincode-input"
      />
      <span
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-ui-10 uppercase tracking-widest",
          status === "looking-up" && "text-muted-foreground tac-blink motion-reduce:animate-none",
          status === "resolved" && "text-accent-success",
          status === "no-match" && "text-accent-warning",
          status === "idle" && "text-muted-foreground/40",
        )}
      >
        {status === "looking-up" && "…"}
        {status === "resolved" && "✓"}
        {status === "no-match" && "?"}
        {status === "idle" && "PIN"}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SmartAddressFields  — composed controlled grouping
// ─────────────────────────────────────────────────────────────────────────────

export interface SmartAddressValue {
  line1?: string
  line2?: string
  city?: string
  state?: string
  zip?: string
}

interface SmartAddressFieldsProps {
  value: SmartAddressValue
  onChange: (next: SmartAddressValue) => void
  /** Visual label shown above the line1 input (e.g. "Sender address"). */
  label?: string
  errors?: Partial<Record<keyof SmartAddressValue, string | undefined>>
  /** Disables PIN-driven city/state autofill. Defaults to `false`. */
  disablePincodeLookup?: boolean
  /** Hide the optional second address line — for forms whose schema has a single address blob. */
  hideLine2?: boolean
  disabled?: boolean
  /** Field-name prefix for `id` attributes (so multiple instances don't collide). */
  idPrefix?: string
  className?: string
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-2xs uppercase tracking-wider text-muted-foreground"
    >
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="font-mono text-2xs text-accent-danger" role="alert">
      {message}
    </p>
  )
}

function PlainTextInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  invalid,
}: {
  id?: string
  value?: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  disabled?: boolean
  invalid?: boolean
}) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- Address input in combobox layout; inline positioning requires direct DOM sizing that the shadcn Input wrapper would constrain
    <input
      id={id}
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9 w-full border border-border bg-background px-3 font-sans text-sm",
        "placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none",
        "focus:ring-1 focus:ring-primary disabled:opacity-60",
      )}
    />
  )
}

function SmartAddressFields({
  value,
  onChange,
  label,
  errors,
  disablePincodeLookup,
  hideLine2,
  disabled,
  idPrefix = "addr",
  className,
}: SmartAddressFieldsProps) {
  const update = React.useCallback(
    (patch: Partial<SmartAddressValue>) => {
      onChange({ ...value, ...patch })
    },
    [onChange, value],
  )

  return (
    <fieldset
      data-slot="smart-address-fields"
      className={cn("flex flex-col gap-3", className)}
      disabled={disabled}
    >
      {label ? (
        <legend className="font-mono text-2xs uppercase tracking-widest text-primary">
          {label}
        </legend>
      ) : null}

      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={`${idPrefix}-line1`}>Address line 1</FieldLabel>
        <PlainTextInput
          id={`${idPrefix}-line1`}
          value={value.line1}
          onChange={(v) => update({ line1: v })}
          placeholder="Plot no. / building / street"
          autoComplete="address-line1"
          invalid={Boolean(errors?.line1)}
        />
        <FieldError message={errors?.line1} />
      </div>

      {hideLine2 ? null : (
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${idPrefix}-line2`}>Address line 2 (optional)</FieldLabel>
          <PlainTextInput
            id={`${idPrefix}-line2`}
            value={value.line2}
            onChange={(v) => update({ line2: v })}
            placeholder="Landmark / locality"
            autoComplete="address-line2"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${idPrefix}-state`}>State / UT</FieldLabel>
          <IndianStateCombobox
            id={`${idPrefix}-state`}
            value={value.state}
            onChange={(name) => update({ state: name })}
            aria-invalid={Boolean(errors?.state)}
          />
          <FieldError message={errors?.state} />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={`${idPrefix}-city`}>City / Town</FieldLabel>
          <IndianCityCombobox
            id={`${idPrefix}-city`}
            value={value.city}
            stateCode={value.state}
            onChange={(name) => update({ city: name })}
            aria-invalid={Boolean(errors?.city)}
          />
          <FieldError message={errors?.city} />
        </div>
      </div>

      {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
      <div className="flex flex-col gap-1 sm:max-w-[220px]">
        <FieldLabel htmlFor={`${idPrefix}-zip`}>PIN code</FieldLabel>
        <PincodeInput
          id={`${idPrefix}-zip`}
          value={value.zip}
          onChange={(v) => update({ zip: v })}
          onResolve={
            disablePincodeLookup
              ? undefined
              : (r) => {
                  // Only autofill empty target fields — don't clobber user entries.
                  const patch: Partial<SmartAddressValue> = { zip: r.pincode }
                  if (!value.city || value.city.trim().length === 0) patch.city = r.city
                  if (!value.state || value.state.trim().length === 0) patch.state = r.state
                  update(patch)
                }
          }
          aria-invalid={Boolean(errors?.zip)}
        />
        <FieldError message={errors?.zip} />
      </div>
    </fieldset>
  )
}

export {
  IndianStateCombobox,
  IndianCityCombobox,
  PincodeInput,
  SmartAddressFields,
  lookupIndianPincode,
}
export type { PincodeLookupResult }
