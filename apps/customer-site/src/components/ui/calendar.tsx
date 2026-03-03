"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rounded-xl border border-border bg-card p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row sm:gap-4",
        month: "space-y-3",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 rounded-full border-border bg-background p-0 text-muted-foreground opacity-100 shadow-none hover:bg-muted hover:text-foreground"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 rounded-md text-xs font-medium text-muted-foreground",
        row: "mt-1.5 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-md p-0 font-medium text-foreground aria-selected:opacity-100 hover:bg-muted"
        ),
        day_range_end: "day-range-end",
        day_selected: "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-primary/10 text-primary font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-primary/10 aria-selected:text-muted-foreground aria-selected:opacity-70",
        day_disabled: "text-muted-foreground opacity-45",
        day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
