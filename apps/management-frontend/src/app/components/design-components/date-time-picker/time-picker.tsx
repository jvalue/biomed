import { Clock } from 'lucide-react';
import * as React from 'react';
import { useImperativeHandle } from 'react';
import {
	Granularity,
	Period,
	TimePickerType,
} from '@/src/app/components/design-components/date-time-picker/types';
import {
	display12HourValue,
	getArrowByType,
	getDateByType,
	setDateByType,
} from '@/src/app/components/design-components/date-time-picker/utils';
import { Input } from '@/src/app/components/design-components/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/src/app/components/design-components/select';
import { cn } from '@/src/utils';

interface PeriodSelectorProps {
	period: Period;
	setPeriod?: (m: Period) => void;
	date?: Date | null;
	onDateChange?: (date: Date | undefined) => void;
	onRightFocus?: () => void;
	onLeftFocus?: () => void;
}

const TimePeriodSelect = React.forwardRef<HTMLButtonElement, PeriodSelectorProps>(
	({ period, setPeriod, date, onDateChange, onLeftFocus, onRightFocus }, ref) => {
		const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
			if (e.key === 'ArrowRight') onRightFocus?.();
			if (e.key === 'ArrowLeft') onLeftFocus?.();
		};

		const handleValueChange = (value: Period) => {
			setPeriod?.(value);

			/**
			 * trigger an update whenever the user switches between AM and PM;
			 * otherwise user must manually change the hour each time
			 */
			if (date) {
				const tempDate = new Date(date);
				const hours = display12HourValue(date.getHours());
				onDateChange?.(
					setDateByType(tempDate, hours.toString(), '12hours', period === 'AM' ? 'PM' : 'AM'),
				);
			}
		};

		return (
			<div className="flex h-10 items-center">
				<Select defaultValue={period} onValueChange={(value: Period) => handleValueChange(value)}>
					<SelectTrigger
						ref={ref}
						className="focus:bg-accent focus:text-accent-foreground w-[65px]"
						onKeyDown={handleKeyDown}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="AM">AM</SelectItem>
						<SelectItem value="PM">PM</SelectItem>
					</SelectContent>
				</Select>
			</div>
		);
	},
);

TimePeriodSelect.displayName = 'TimePeriodSelect';

interface TimePickerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	picker: TimePickerType;
	date?: Date | null;
	onDateChange?: (date: Date | undefined) => void;
	period?: Period;
	onRightFocus?: () => void;
	onLeftFocus?: () => void;
}

export const TimePickerInput = React.forwardRef<HTMLInputElement, TimePickerInputProps>(
	(
		{
			className,
			type = 'tel',
			value,
			id,
			name,
			date = new Date(new Date().setHours(0, 0, 0, 0)),
			onDateChange,
			onChange,
			onKeyDown,
			picker,
			period,
			onLeftFocus,
			onRightFocus,
			...props
		},
		ref,
	) => {
		const [flag, setFlag] = React.useState<boolean>(false);
		const [prevIntKey, setPrevIntKey] = React.useState<string>('0');

		/**
		 * allow the user to enter the second digit within 2 seconds
		 * otherwise start again with entering first digit
		 */
		React.useEffect(() => {
			if (flag) {
				const timer = setTimeout(() => {
					setFlag(false);
				}, 2000);

				return () => clearTimeout(timer);
			}
		}, [flag]);

		const calculatedValue = React.useMemo(() => {
			return getDateByType(date, picker);
		}, [date, picker]);

		const calculateNewValue = (key: string) => {
			/*
			 * If picker is '12hours' and the first digit is 0, then the second digit is automatically set to 1.
			 * The second entered digit will break the condition and the value will be set to 10-12.
			 */
			if (picker === '12hours') {
				if (flag && calculatedValue.slice(1, 2) === '1' && prevIntKey === '0') return `0${key}`;
			}

			return !flag ? `0${key}` : calculatedValue.slice(1, 2) + key;
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Tab') return;
			e.preventDefault();
			if (e.key === 'ArrowRight') onRightFocus?.();
			if (e.key === 'ArrowLeft') onLeftFocus?.();
			if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
				const step = e.key === 'ArrowUp' ? 1 : -1;
				const newValue = getArrowByType(calculatedValue, step, picker);
				if (flag) setFlag(false);
				const tempDate = date ? new Date(date) : new Date();
				onDateChange?.(setDateByType(tempDate, newValue, picker, period));
			}
			if (e.key >= '0' && e.key <= '9') {
				if (picker === '12hours') setPrevIntKey(e.key);

				const newValue = calculateNewValue(e.key);
				if (flag) onRightFocus?.();
				setFlag((prev) => !prev);
				const tempDate = date ? new Date(date) : new Date();
				onDateChange?.(setDateByType(tempDate, newValue, picker, period));
			}
		};

		return (
			<Input
				ref={ref}
				id={id || picker}
				name={name || picker}
				className={cn(
					'focus:bg-accent focus:text-accent-foreground w-[48px] text-center font-mono text-base tabular-nums caret-transparent [&::-webkit-inner-spin-button]:appearance-none',
					className,
				)}
				value={value || calculatedValue}
				onChange={(e) => {
					e.preventDefault();
					onChange?.(e);
				}}
				type={type}
				inputMode="decimal"
				onKeyDown={(e) => {
					onKeyDown?.(e);
					handleKeyDown(e);
				}}
				{...props}
			/>
		);
	},
);

TimePickerInput.displayName = 'TimePickerInput';

interface TimePickerProps {
	date?: Date | null;
	onChange?: (date: Date | undefined) => void;
	hourCycle?: 12 | 24;
	/**
	 * Determines the smallest unit that is displayed in the datetime picker.
	 * Default is 'second'.
	 * */
	granularity?: Granularity;
}

interface TimePickerRef {
	minuteRef: HTMLInputElement | null;
	hourRef: HTMLInputElement | null;
	secondRef: HTMLInputElement | null;
	periodRef: HTMLButtonElement | null;
}

export const TimePicker = React.forwardRef<TimePickerRef, TimePickerProps>(
	({ date, onChange, hourCycle = 24, granularity = 'second' }, ref) => {
		const minuteRef = React.useRef<HTMLInputElement>(null);
		const hourRef = React.useRef<HTMLInputElement>(null);
		const secondRef = React.useRef<HTMLInputElement>(null);
		const periodRef = React.useRef<HTMLButtonElement>(null);
		const [period, setPeriod] = React.useState<Period>(date && date.getHours() >= 12 ? 'PM' : 'AM');

		useImperativeHandle(
			ref,
			() => ({
				minuteRef: minuteRef.current,
				hourRef: hourRef.current,
				secondRef: secondRef.current,
				periodRef: periodRef.current,
			}),
			[minuteRef, hourRef, secondRef, periodRef],
		);
		return (
			<div className="flex items-center justify-center gap-2">
				<label htmlFor="datetime-picker-hour-input" className="cursor-pointer">
					<Clock className="mr-2 h-4 w-4" />
				</label>
				<TimePickerInput
					picker={hourCycle === 24 ? 'hours' : '12hours'}
					date={date}
					id="datetime-picker-hour-input"
					onDateChange={onChange}
					ref={hourRef}
					period={period}
					onRightFocus={() => minuteRef?.current?.focus()}
				/>
				{(granularity === 'minute' || granularity === 'second') && (
					<>
						:
						<TimePickerInput
							picker="minutes"
							date={date}
							onDateChange={onChange}
							ref={minuteRef}
							onLeftFocus={() => hourRef?.current?.focus()}
							onRightFocus={() => secondRef?.current?.focus()}
						/>
					</>
				)}
				{granularity === 'second' && (
					<>
						:
						<TimePickerInput
							picker="seconds"
							date={date}
							onDateChange={onChange}
							ref={secondRef}
							onLeftFocus={() => minuteRef?.current?.focus()}
							onRightFocus={() => periodRef?.current?.focus()}
						/>
					</>
				)}
				{hourCycle === 12 && (
					<div className="grid gap-1 text-center">
						<TimePeriodSelect
							period={period}
							setPeriod={setPeriod}
							date={date}
							onDateChange={(date) => {
								onChange?.(date);
								if (date && date?.getHours() >= 12) {
									setPeriod('PM');
								} else {
									setPeriod('AM');
								}
							}}
							ref={periodRef}
							onLeftFocus={() => secondRef?.current?.focus()}
						/>
					</div>
				)}
			</div>
		);
	},
);
TimePicker.displayName = 'TimePicker';
