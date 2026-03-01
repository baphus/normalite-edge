"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "relative flex flex-col gap-4",
                month: "flex flex-col gap-2",
                month_caption: "flex justify-center items-center h-9",
                caption_label: "text-sm font-semibold text-gray-800",
                nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1 h-9 z-10",
                button_previous: "h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
                button_next: "h-7 w-7 rounded-md border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-gray-400 rounded-md w-9 font-medium text-[11px] uppercase tracking-wider text-center py-1",
                week: "flex w-full mt-1",
                day: "relative h-9 w-9 p-0 text-center text-sm",
                day_button: cn(
                    "h-9 w-9 rounded-md text-sm font-medium transition-colors",
                    "hover:bg-primary/10 hover:text-primary",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30",
                    "aria-selected:opacity-100",
                ),
                selected:
                    "bg-primary text-white rounded-md hover:bg-primary hover:text-white focus:bg-primary focus:text-white",
                today: "text-primary font-bold",
                outside: "text-gray-300",
                disabled: "text-gray-300 cursor-not-allowed",
                range_start: "bg-primary text-white rounded-l-md",
                range_middle: "bg-primary/10 text-primary rounded-none",
                range_end: "bg-primary text-white rounded-r-md",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) =>
                    orientation === "left" ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    ),
            }}
            {...props}
        />
    );
}

Calendar.displayName = "Calendar";

export { Calendar };
