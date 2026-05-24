"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Calendar } from "@workspace/ui/components/primitives/calendar"
import { OpsButton } from "./ops-button"

interface UpcomingOpItem {
  id: string
  label: string
  /** Pre-formatted display ETA, e.g. "22 May". */
  eta: string
  /** Raw `YYYY-MM-DD` if available — drives calendar highlighting. */
  etaDate?: string | null
}

interface OpsUpcomingCalendarProps {
  upcoming: UpcomingOpItem[]
  /** Optional click handler for the "View all" affordance. */
  onViewAll?: () => void
  className?: string
}

/**
 * OpsUpcomingCalendar — Paper Ops Console enhancement of the "Upcoming
 * Operations" panel. Shares the title + paper-label subtitle anatomy with
 * OpsGrowthAreaChart and OpsVolumeBarChart, then replaces the empty-state
 * text with a Calendar that highlights every day with a scheduled
 * departure. The compact list of next-N ops sits below the calendar with
 * its own paper-id + label rhythm.
 */
function OpsUpcomingCalendar({
  upcoming,
  onViewAll,
  className,
}: OpsUpcomingCalendarProps) {
  // Parse all `etaDate` strings into Date objects for react-day-picker.
  // We normalize to local midnight so a date string like "2026-05-13"
  // selects the May 13 cell regardless of timezone offset.
  const scheduledDates = React.useMemo<Date[]>(() => {
    const dates: Date[] = []
    for (const op of upcoming) {
      if (!op.etaDate) continue
      const [y, m, d] = op.etaDate.split("-").map(Number)
      if (!y || !m || !d) continue
      dates.push(new Date(y, m - 1, d))
    }
    return dates
  }, [upcoming])

  // Land the calendar on the earliest scheduled month so the operator
  // immediately sees the highlighted cell — fall back to today otherwise.
  const defaultMonth = scheduledDates.length > 0 ? scheduledDates[0] : new Date()

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Row 1: title + "View all" affordance — matches other ops panels */}
      <div className="flex items-center justify-between">
        <h3 className="t-h4 text-foreground">Upcoming Operations</h3>
        <OpsButton variant="dark" size="sm" onClick={onViewAll}>
          View all
        </OpsButton>
      </div>

      {/* Row 2: paper-label subtitle (matches Growth / Volume panels) */}
      <div className="paper-label mt-2.5">
        Scheduled manifests by departure date
      </div>

      {/* Row 3: calendar with departure highlights */}
      <div className="mt-3 border border-border bg-card flex justify-center">
        <Calendar
          mode="multiple"
          selected={scheduledDates}
          defaultMonth={defaultMonth}
          modifiers={{ scheduled: scheduledDates }}
          modifiersClassNames={{
            scheduled:
              "bg-primary/10 text-primary font-semibold ring-1 ring-primary/30",
          }}
          // The dashboard renders this widget as a read-only signal; we
          // don't want clicking a day to mutate selection state. Suppress
          // the onSelect side-effect so the highlight stays bound to the
          // `upcoming` data, not user clicks.
          onSelect={() => {}}
          className="p-2"
        />
      </div>

      {/* Row 4: compact list of upcoming ops, sized to match the chart legend
          slot in the other two panels. Each item: paper-id (manifest) +
          eta + label. */}
      {upcoming.length === 0 ? (
        <div className="paper-label mt-3">No scheduled departures</div>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {upcoming.slice(0, 3).map((op) => (
            <li
              key={op.id}
              className="py-2 flex items-center justify-between"
            >
              <div>
                <div className="paper-label">{op.eta}</div>
                <div className="font-sans font-semibold text-ui-12 mt-0.5 text-foreground">
                  {op.label}
                </div>
              </div>
              <span className="paper-id text-ui-11">{op.id.slice(0, 6)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { OpsUpcomingCalendar }
export type { OpsUpcomingCalendarProps, UpcomingOpItem }
