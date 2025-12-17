import { useRouter } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { Button } from '@/src/app/components/design-components/button';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from '@/src/app/components/design-components/field';
import { Input } from '@/src/app/components/design-components/input';
import { useAuth } from '@/src/app/contexts/AuthContext';

type loginError = 'NONE' | 'INVALID' | 'UNKNOWN' | 'ACCOUNT_PENDING';

export function LoginFormComponent() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<loginError>('NONE');
	const { login } = useAuth();
	const router = useRouter();

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		try {
			await login(username, password);
			await router.navigate({ to: '/' });
		} catch (err: any) {
			if (err.response?.status === 401) {
				setError('INVALID');
			} else if (err.response?.status === 403) {
				setError('ACCOUNT_PENDING');
			} else {
				setError('UNKNOWN');
			}
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<FieldSet>
					<FieldLegend>Login</FieldLegend>
					<FieldDescription>
						Log in with your username and password. If you don't have an account yet switch to the
						"Register" tab
					</FieldDescription>
					<FieldGroup>
						<Field>
							<FieldLabel>Username</FieldLabel>
							<Input
								id="username"
								name="username"
								type="text"
								placeholder="Username"
								autoComplete="username"
								required
								pattern="[A-Za-z0-9]+"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
							<FieldDescription>
								Must contain only alphanumeric characters and numbers.
							</FieldDescription>
							{error === 'INVALID' && (
								<FieldDescription className="text-destructive">
									Wrong username or password
								</FieldDescription>
							)}
						</Field>
						<Field>
							<FieldLabel>Password</FieldLabel>
							<Input
								id="password"
								name="password"
								type="password"
								placeholder="Password"
								autoComplete="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<FieldDescription>
								Your password will be handled encrypted and securely.
							</FieldDescription>
							{error === 'INVALID' && (
								<FieldDescription className="text-destructive">
									Wrong username or password
								</FieldDescription>
							)}
						</Field>
					</FieldGroup>
				</FieldSet>
				<Field>
					{error === 'UNKNOWN' && (
						<FieldDescription className="text-destructive">
							An unknown error occurred, please try again later or contact your administrator
						</FieldDescription>
					)}
					{error === 'ACCOUNT_PENDING' && (
						<FieldDescription className="text-destructive">
							Your account is not approved yet. Please contact your administrator.
						</FieldDescription>
					)}
					<Button type="submit">Login</Button>
				</Field>
			</FieldGroup>
		</form>
	);
}
