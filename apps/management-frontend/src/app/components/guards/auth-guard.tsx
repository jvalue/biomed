import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Spinner } from '@/src/app/components/design-components/spinner';
import { useAuth } from '@/src/app/contexts/AuthContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// Allow access only if authenticated
		if (!isLoading && !isAuthenticated) {
			router.navigate({ to: '/login' });
		}
	}, [isAuthenticated, isLoading, router]);

	// Show spinner while loading
	if (isLoading) {
		return (
			<div className="col-span-12 flex justify-center pt-6">
				<Spinner className="size-10" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	return <>{children}</>;
}
