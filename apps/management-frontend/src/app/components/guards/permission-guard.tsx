import type { PureAbility } from '@casl/ability';
import React from 'react';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';

export type RequiredPermission = {
	action: string;
	subject: string | object;
	label?: string; // optional readable label for UI
};

type PermissionGuardProps = {
	ability: PureAbility;
	required: RequiredPermission[]; // permissions that are required
	children: React.ReactNode;
};

/**
 * Guard component that checks if the user has the required permissions.
 * If not, it displays an access denied message with the missing permissions.
 * @param ability
 * @param required
 * @param children
 * @constructor
 */
export function PermissionGuard({ ability, required, children }: PermissionGuardProps) {
	const missing = React.useMemo(
		() =>
			required.filter((p) => {
				try {
					// Check if the ability allows the action on the subject (CASL)
					return !ability.can(p.action, p.subject);
				} catch {
					// If ability throws for unknown subject shape, consider it missing
					return true;
				}
			}),
		[ability, required],
	);

	// If no permissions are missing, render children
	if (missing.length === 0) return <>{children}</>;

	// Render access denied message with missing permissions
	return (
		<div className="grid grid-cols-12 gap-4">
			<Card className="col-span-8 col-start-3">
				<CardHeader>
					<CardTitle className="text-destructive">Access Denied</CardTitle>
					<CardDescription>
						You do not have the necessary permissions to access this area.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<CardDescription className="font-semibold">
						You are missing the following permissions:
						{missing.map((p, i) => (
							<li key={i}>{p.label ?? `${p.action} ${formatSubject(p.subject)}`}</li>
						))}
					</CardDescription>
				</CardContent>
				<CardFooter>
					<CardDescription>
						If you believe this is an error, ask your administrator to grant the listed permissions
						for your account.
					</CardDescription>
				</CardFooter>
			</Card>
		</div>
	);
}

function formatSubject(subject: string | object) {
	if (typeof subject === 'string') return subject;
	try {
		// try to print a compact description for object subjects
		const keys = Object.keys(subject as object);
		if (keys.length === 0) return 'resource';
		return keys.map((k) => `${k}`).join(', ');
	} catch {
		return 'resource';
	}
}
