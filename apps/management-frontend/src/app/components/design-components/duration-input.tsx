// biome-ignore lint/correctness/noUnusedImports: is used
import React, { useMemo } from 'react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export type DurationUnit = 's' | 'm' | 'h';

export interface DurationInputProps {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	placeholder?: string;
	className?: string;
}

const unitToSeconds: Record<DurationUnit, number> = {
	s: 1,
	m: 60,
	h: 3600,
};

const unitLabels: Record<DurationUnit, string> = {
	s: 'Seconds',
	m: 'Minutes',
	h: 'Hours',
};

/**
 * Parses a duration string (e.g., "30s", "5m", "2h") into value and unit
 */
function parseDuration(duration: string): { value: number; unit: DurationUnit } {
	if (!duration) {
		return { value: 0, unit: 's' };
	}

	const match = duration.match(/^(\d+(?:\.\d+)?)(s|m|h)?$/);
	if (match) {
		const value = parseFloat(match[1]);
		const unit = (match[2] || 's') as DurationUnit;
		return { value, unit };
	}

	// Try to parse as plain number (assume seconds)
	const num = parseFloat(duration);
	if (!Number.isNaN(num)) {
		return { value: num, unit: 's' };
	}

	return { value: 0, unit: 's' };
}

/**
 * Formats a value and unit into a duration string
 */
function formatDuration(value: number, unit: DurationUnit): string {
	if (value === 0 || Number.isNaN(value)) {
		return '';
	}
	return `${value}${unit}`;
}

/**
 * Converts a duration to seconds
 */
export function durationToSeconds(duration: string): number {
	if (!duration) return 0;
	const { value, unit } = parseDuration(duration);
	return value * unitToSeconds[unit];
}

/**
 * A duration input component that allows selecting time units
 */
export function DurationInput({
	value,
	onChange,
	id,
	placeholder = '0',
	className = '',
}: DurationInputProps) {
	const { value: numValue, unit } = useMemo(() => parseDuration(value), [value]);

	const handleValueChange = (newValue: string) => {
		const num = parseFloat(newValue);
		if (newValue === '' || Number.isNaN(num)) {
			onChange('');
		} else {
			onChange(formatDuration(num, unit));
		}
	};

	const handleUnitChange = (newUnit: DurationUnit) => {
		if (numValue === 0 || Number.isNaN(numValue)) {
			onChange('');
		} else {
			onChange(formatDuration(numValue, newUnit));
		}
	};

	return (
		<div className={`flex gap-2 ${className}`}>
			<Input
				id={id}
				type="number"
				min={0}
				step="any"
				value={numValue || ''}
				onChange={(e) => handleValueChange(e.target.value)}
				placeholder={placeholder}
				className="flex-1"
			/>
			<Select value={unit} onValueChange={handleUnitChange}>
				<SelectTrigger className="w-[120px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="s">{unitLabels.s}</SelectItem>
					<SelectItem value="m">{unitLabels.m}</SelectItem>
					<SelectItem value="h">{unitLabels.h}</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
