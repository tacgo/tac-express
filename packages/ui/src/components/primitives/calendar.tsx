"use client"

import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@workspace/ui/lib/utils"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "@workspace/ui/icons"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames()

  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        ...defaults,
        root: cn("rdp-root", defaults.root),
        // The absolutely-positioned `nav` is rendered by DayPicker as a
        // sibling of `month` *inside* `months` when `navLayout` is unset
        // (our default). It therefore needs `months` to be the positioning
        // context — without that, the nav climbs the DOM until it finds the
        // nearest positioned ancestor (e.g. an OpsCard with `paper-card-ticks`)
        // and the chevrons land at that ancestor's corners. We also make
        // `month` relative to cover the alternative `navLayout` placement
        // where the nav becomes a child of `month`.
        months: cn("relative", defaults.months),
        month: cn("relative space-y-3", defaults.month),
        month_caption: cn(
          "flex h-7 items-center justify-center px-7",
          defaults.month_caption
        ),
        caption_label: cn(
          "tac-mono-label-base text-foreground",
          defaults.caption_label
        ),
        // `z-10` is required because the nav is rendered *before* `month` in
        // DOM order and overlaps the caption row. Without an explicit z-index
        // the later-painted `month_caption` sits on top and swallows clicks on
        // the prev/next chevron buttons. `inset-x-2` leaves visible breathing
        // room between each chevron and the calendar's grid edges.
        nav: cn(
          "absolute inset-x-2 top-2 z-10 flex items-center justify-between",
          defaults.nav
        ),
        // Ghost variant so the chevrons read as floating glyphs over the
        // calendar rather than as bordered control boxes competing with the
        // grid. The `size-7` button still gives a 28px hit-target.
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 p-0 opacity-70 hover:opacity-100",
          defaults.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 p-0 opacity-70 hover:opacity-100",
          defaults.button_next
        ),
        month_grid: cn("w-full border-collapse space-y-1", defaults.month_grid),
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn(
          "w-8 tac-mono-label-base font-normal text-muted-foreground",
          defaults.weekday
        ),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn(
          "relative size-8 p-0 text-center text-xs focus-within:relative focus-within:z-20",
          defaults.day
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-8 p-0 font-normal aria-selected:opacity-100",
          defaults.day_button
        ),
        range_start: cn(
          "bg-primary/20 text-primary aria-selected:bg-primary aria-selected:text-primary-foreground",
          defaults.range_start
        ),
        range_end: cn(
          "bg-primary/20 text-primary aria-selected:bg-primary aria-selected:text-primary-foreground",
          defaults.range_end
        ),
        range_middle: cn(
          "bg-accent text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground",
          defaults.range_middle
        ),
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          defaults.selected
        ),
        today: cn(
          "border border-primary text-primary",
          defaults.today
        ),
        outside: cn(
          "text-muted-foreground/40 aria-selected:bg-accent/40 aria-selected:text-muted-foreground/40",
          defaults.outside
        ),
        disabled: cn("text-muted-foreground/40 opacity-40", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <RiArrowLeftSLine className="size-4" />
          }
          return <RiArrowRightSLine className="size-4" />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
