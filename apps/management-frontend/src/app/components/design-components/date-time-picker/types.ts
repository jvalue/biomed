export type TimePickerType = 'minutes' | 'seconds' | 'hours' | '12hours';
export type Period = 'AM' | 'PM';
export type Granularity = 'day' | 'hour' | 'minute' | 'second';
export type GetValidNumberConfig = { max: number; min?: number; loop?: boolean };
export type GetValidArrowNumberConfig = {
	min: number;
	max: number;
	step: number;
};
