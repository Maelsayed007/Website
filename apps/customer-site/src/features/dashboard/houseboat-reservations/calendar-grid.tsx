'use client';

import { memo } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
  UIEvent as ReactUIEvent,
} from 'react';
import { format, startOfDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  BOAT_COL_WIDTH,
  HORIZONTAL_DAY_WIDTH,
  getReservationBlockClass,
} from './calendar-utils';
import type { CalendarProcessedBooking, MappedBooking } from './types';

type VisibleBoat = {
  id: string;
  name: string;
  model_id?: string;
};

type CalendarGridProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onGridScroll: (event: ReactUIEvent<HTMLDivElement>) => void;
  onGridKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onGridFocus: () => void;
  totalGridWidth: number;
  totalDaysWidth: number;
  monthSegments: Array<{ key: string; label: string; width: number }>;
  visibleDays: Date[];
  leftDayPadding: number;
  rightDayPadding: number;
  todayKey: number;
  filteredBoatsCount: number;
  rowHeight: number;
  rowStartIndex: number;
  rowEndIndex: number;
  visibleBoats: VisibleBoat[];
  modelNameById: Map<string, string>;
  visibleProcessedBookings: CalendarProcessedBooking[];
  highlightedId: string | null;
  dragPreviewStyle: CSSProperties | null;
  activeCellStyle: CSSProperties | null;
  onOpenBooking: (booking: MappedBooking) => void;
  onDayCellMouseDown: (boatId: string, day: Date, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onDayCellHover: (boatId: string, day: Date, event: ReactMouseEvent<HTMLButtonElement>) => void;
  onDayCellClick: (boatId: string, day: Date, event: ReactMouseEvent<HTMLButtonElement>) => void;
};

const ReservationBlock = memo(function ReservationBlock({
  booking,
  rowHeight,
  highlighted,
  onOpen,
}: {
  booking: CalendarProcessedBooking;
  rowHeight: number;
  highlighted: boolean;
  onOpen: (booking: MappedBooking) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'absolute pointer-events-auto rounded-md border border-zinc-700 bg-zinc-900/90 px-1.5 text-left text-white shadow-none transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        getReservationBlockClass(booking),
        booking.isOverflowLeft && 'rounded-l-none border-l-0',
        booking.isOverflowRight && 'rounded-r-none border-r-0',
        highlighted && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        left: booking.left + 1,
        width: Math.max(booking.width - 2, 20),
        top: booking.top + 4,
        height: Math.max(rowHeight - 10, 22),
      }}
      onClick={() => onOpen(booking)}
      title="Open reservation preview"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('truncate font-semibold uppercase tracking-tight', rowHeight < 34 ? 'text-[8px]' : 'text-[10px]')}>
          {booking.clientName}
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded bg-black/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-inherit">
            {(booking.source || 'manual').slice(0, 3)}
          </span>
        </div>
      </div>
    </button>
  );
});

export const CalendarGrid = memo(function CalendarGrid({
  scrollContainerRef,
  onGridScroll,
  onGridKeyDown,
  onGridFocus,
  totalGridWidth,
  totalDaysWidth,
  monthSegments,
  visibleDays,
  leftDayPadding,
  rightDayPadding,
  todayKey,
  filteredBoatsCount,
  rowHeight,
  rowStartIndex,
  rowEndIndex,
  visibleBoats,
  modelNameById,
  visibleProcessedBookings,
  highlightedId,
  dragPreviewStyle,
  activeCellStyle,
  onOpenBooking,
  onDayCellMouseDown,
  onDayCellHover,
  onDayCellClick,
}: CalendarGridProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border border-border bg-card shadow-none">
      <div
        ref={scrollContainerRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-auto focus:outline-none"
        onScroll={onGridScroll}
        onKeyDown={onGridKeyDown}
        onFocus={onGridFocus}
        tabIndex={0}
        role="grid"
        aria-label="Houseboat reservation calendar grid"
      >
        <div className="inline-block min-w-full" style={{ width: totalGridWidth }}>
          <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
            <div className="flex h-8 border-b border-border">
              <div
                className="sticky left-0 z-30 flex items-center border-r border-border bg-card px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ width: BOAT_COL_WIDTH }}
              >
                Fleet units
              </div>
              {monthSegments.map((month) => (
                <div
                  key={month.key}
                  className="flex items-center justify-center border-r border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ width: month.width }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            <div className="flex h-[56px] border-b border-border">
              <div className="sticky left-0 z-30 border-r border-border bg-card" style={{ width: BOAT_COL_WIDTH }} />
              <div className="flex" style={{ width: totalDaysWidth }}>
                <div style={{ width: leftDayPadding }} />
                {visibleDays.map((day) => {
                  const isToday = startOfDay(day).getTime() === todayKey;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn('flex border-r border-border', isToday ? 'bg-primary/5' : 'bg-card')}
                      style={{ width: HORIZONTAL_DAY_WIDTH }}
                    >
                      <div className="flex w-full flex-col">
                        <div className="flex h-7 items-center justify-center border-b border-border">
                          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', isToday ? 'text-primary' : 'text-muted-foreground')}>
                            {format(day, 'EEE')} {format(day, 'd')}
                          </span>
                        </div>
                        <div className="flex h-6">
                          <div className="flex w-1/2 items-center justify-center border-r border-dashed border-border">
                            <span className="text-[9px] font-medium text-muted-foreground">AM</span>
                          </div>
                          <div className="flex w-1/2 items-center justify-center">
                            <span className="text-[9px] font-medium text-muted-foreground">PM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ width: rightDayPadding }} />
              </div>
            </div>
          </div>
          <div className="relative" style={{ height: filteredBoatsCount * rowHeight }}>
            <div style={{ height: rowStartIndex * rowHeight }} />
            {visibleBoats.map((boat) => (
              <div
                key={boat.id}
                className="flex border-b border-border/70 transition-colors hover:bg-muted/20"
                style={{ height: rowHeight }}
              >
                <div
                  className="sticky left-0 z-10 flex items-center gap-2 border-r border-border bg-card px-3"
                  style={{ width: BOAT_COL_WIDTH }}
                >
                  <p className="max-w-[128px] truncate text-xs font-semibold text-foreground" title={boat.name}>
                    {boat.name}
                  </p>
                  <span className="max-w-[72px] truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                    {(boat.model_id && modelNameById.get(boat.model_id)) || ''}
                  </span>
                </div>
                <div className="flex" style={{ width: totalDaysWidth }}>
                  <div style={{ width: leftDayPadding }} />
                  {visibleDays.map((day) => (
                    <div
                      key={`${boat.id}-${day.toISOString()}`}
                      className="border-r border-border"
                      style={{ width: HORIZONTAL_DAY_WIDTH }}
                    >
                      <button
                        type="button"
                        className="relative h-full w-full hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/70 after:absolute after:inset-y-0 after:left-1/2 after:border-l after:border-dashed after:border-border"
                        onMouseDown={(event) => onDayCellMouseDown(boat.id, day, event)}
                        onMouseEnter={(event) => onDayCellHover(boat.id, day, event)}
                        onMouseMove={(event) => onDayCellHover(boat.id, day, event)}
                        onClick={(event) => onDayCellClick(boat.id, day, event)}
                        title={`Create reservation on ${boat.name} (${format(day, 'MMM dd')})`}
                        aria-label={`Create reservation on ${boat.name} for ${format(day, 'MMMM dd')}`}
                      />
                    </div>
                  ))}
                  <div style={{ width: rightDayPadding }} />
                </div>
              </div>
            ))}
            <div style={{ height: Math.max(0, (filteredBoatsCount - rowEndIndex - 1) * rowHeight) }} />

            <div className="pointer-events-none absolute inset-0" style={{ left: BOAT_COL_WIDTH }}>
              {activeCellStyle ? (
                <div className="absolute rounded-sm border border-primary bg-primary/20" style={activeCellStyle} />
              ) : null}
              {dragPreviewStyle ? (
                <div className="absolute rounded-md border-2 border-primary/60 bg-primary/20" style={dragPreviewStyle} />
              ) : null}
              {visibleProcessedBookings.map((booking) => (
                <ReservationBlock
                  key={booking.id}
                  booking={booking}
                  rowHeight={rowHeight}
                  highlighted={highlightedId === booking.id}
                  onOpen={onOpenBooking}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
