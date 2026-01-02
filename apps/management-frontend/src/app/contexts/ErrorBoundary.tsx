import React from 'react';
import { toast } from 'react-toastify';

interface State {
	hasError: boolean;
	error: Error | null;
}

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
	// biome-ignore lint/suspicious/noExplicitAny: react example
	constructor(props: any) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	/**
	 * Updates state when an error is thrown
	 * @param error
	 */
	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	/**
	 * Catches errors in child components
	 * @param error
	 * @param info
	 */
	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('Uncaught error (ErrorBoundary):', error, info);
		toast.error(`An error occurred: ${error.message}`, { autoClose: 8000 });
	}

	render() {
		if (this.state.hasError) {
			return (
				<div role="alert" className="p-4 bg-red-50 text-red-800">
					An unexpected error occurred. Please try refreshing the page.
				</div>
			);
		}
		return this.props.children;
	}
}

export default GlobalErrorBoundary;
