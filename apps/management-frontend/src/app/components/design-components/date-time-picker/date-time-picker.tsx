import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { useImperativeHandle, useRef } from 'react';
import { DayPickerProps, Matcher } from 'react-day-picker';
import { Button } from '@/src/app/components/design-components/button';
import { Calendar } from '@/src/app/components/design-components/date-time-picker/calendar';
import { TimePicker } from '@/src/app/components/design-components/date-time-picker/time-picker';
import { Granularity } from '@/src/app/components/design-components/date-time-picker/types';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/src/app/components/design-components/popover';
import { cn } from '@/src/utils';

export type DateTimePickerProps = {
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	onMonthChange?: (date: Date | undefined) => void;
	disabled?: boolean;
	hourCycle?: 12 | 24;
	placeholder?: string;
	yearRange?: number;
	displayFormat?: { hour24?: string; hour12?: string };
	granularity?: Granularity;
	className?: string;
	defaultPopupValue?: Date;
	minDate?: Date;
	maxDate?: Date;
} & Pick<
	DayPickerProps,
	'locale' | 'weekStartsOn' | 'showWeekNumber' | 'showOutsideDays' | 'disabled'
>;

export type DateTimePickerRef = {
	value?: Date;
} & Omit<HTMLButtonElement, 'value'>;

export const DateTimePicker = React.forwardRef<Partial<DateTimePickerRef>, DateTimePickerProps>(
	(
		{
			locale = enUS,
			defaultPopupValue = new Date(new Date().setHours(0, 0, 0, 0)),
			value,
			onChange,
			onMonthChange,
			hourCycle = 24,
			yearRange = 50,
			disabled = false,
			displayFormat,
			granularity = 'second',
			placeholder = 'Pick a date',
			className,
			minDate,
			maxDate,
			disabled: dayDisabled,
			...props
		},
		ref,
	) => {
		const buttonRef = useRef<HTMLButtonElement>(null);

		const [open, setOpen] = React.useState(false);

		// month = current "view" month/time (for rendering + TimePicker input base)
		const [month, setMonth] = React.useState<Date>(value ?? defaultPopupValue);

		// displayDate = what the UI shows (draft while editing)
		const [displayDate, setDisplayDate] = React.useState<Date | undefined>(value ?? undefined);

		// track whether user changed anything while popover is open
		const dirtyRef = React.useRef(false);

		// when parent value changes (external), sync draft
		React.useEffect(() => {
			setDisplayDate(value);
			if (value) setMonth(value);
		}, [value]);

		const commit = React.useCallback(
			(d?: Date) => {
				onChange?.(d);
				setDisplayDate(d);
				if (d) setMonth(d);
				dirtyRef.current = false;
			},
			[onChange],
		);

		const handleMonthChange = (newMonth: Date | undefined) => {
			if (!newMonth) return;

			const next = new Date(newMonth);
			next.setHours(month?.getHours() ?? 0, month?.getMinutes() ?? 0, month?.getSeconds() ?? 0);

			setMonth(next);
			onMonthChange?.(next);
		};

		const onSelectDay = (newDay?: Date) => {
			if (!newDay) return;
			dirtyRef.current = true;
			setDisplayDate(newDay);
			setMonth(newDay);
		};

		useImperativeHandle(
			ref,
			() => ({
				...buttonRef.current,
				value: displayDate,
			}),
			[displayDate],
		);

		const initHourFormat = {
			hour24:
				displayFormat?.hour24 ??
				`PPP HH:mm${!granularity || granularity === 'second' ? ':ss' : ''}`,
			hour12:
				displayFormat?.hour12 ??
				`PP hh:mm${!granularity || granularity === 'second' ? ':ss' : ''} b`,
		};

		let loc = enUS;
		const { options, localize, formatLong } = locale;
		if (options && localize && formatLong) {
			loc = { ...enUS, options, localize, formatLong };
		}

		const calendarDisabled = React.useMemo<Matcher[] | undefined>(() => {
			const rules: Matcher[] = [];

			if (dayDisabled) rules.push(...(Array.isArray(dayDisabled) ? dayDisabled : [dayDisabled]));
			if (minDate) rules.push({ before: minDate });
			if (maxDate) rules.push({ after: maxDate });

			return rules.length ? rules : undefined;
		}, [dayDisabled, minDate, maxDate]);

		return (
			<Popover
				open={open}
				onOpenChange={(nextOpen) => {
					// when closing: if user edited time (dirty) commit the draft once
					if (!nextOpen && dirtyRef.current) {
						commit(displayDate);
					}
					setOpen(nextOpen);
				}}
			>
				<PopoverTrigger asChild disabled={disabled}>
					<Button
						variant="outline"
						className={cn(
							'w-full justify-start text-left font-normal',
							!displayDate && 'text-muted-foreground',
							className,
						)}
						ref={buttonRef}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{displayDate ? (
							<span className="truncate">
								{format(
									displayDate,
									hourCycle === 24 ? initHourFormat.hour24 : initHourFormat.hour12,
									{
										locale: loc,
									},
								)}
							</span>
						) : (
							<span>{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-auto p-0">
					<Calendar
						mode="single"
						selected={displayDate}
						month={month}
						disabled={calendarDisabled}
						onSelect={(newDate) => {
							if (!newDate) return;
							newDate.setHours(
								month?.getHours() ?? 0,
								month?.getMinutes() ?? 0,
								month?.getSeconds() ?? 0,
							);
							onSelectDay(newDate);
						}}
						onMonthChange={handleMonthChange}
						yearRange={yearRange}
						locale={locale}
						{...props}
					/>

					{granularity !== 'day' && (
						<div className="border-border border-t p-3">
							<TimePicker
								onChange={(next) => {
									// draft-only while typing
									dirtyRef.current = true;
									setDisplayDate(next);
									if (next) setMonth(next);
								}}
								date={month}
								hourCycle={hourCycle}
								granularity={granularity}
							/>
						</div>
					)}
				</PopoverContent>
			</Popover>
		);
	},
);

DateTimePicker.displayName = 'DateTimePicker';
