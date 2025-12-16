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

type loginError = 'NONE' | 'INVALID' | 'UNKNOWN' | 'WEAK_PASSWORD';

export function RegisterForm() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<loginError>('NONE');
	const { register } = useAuth();
	const router = useRouter();

	const handleSubmit = async (e?: FormEvent) => {
		e?.preventDefault();
		setError('NONE');
		const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

		if (!passwordRegex.test(password)) {
			setError('WEAK_PASSWORD');
			return;
		}

		try {
			await register(username, password);
			await router.navigate({ to: '/' });
		} catch (err: any) {
			if (err.response?.status === 401) {
				setError('INVALID');
			} else {
				setError('UNKNOWN');
			}
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<FieldSet>
					<FieldLegend>Register</FieldLegend>
					<FieldDescription>
						Please enter your username and password to create a new account. If you already have an
						account, please switch to the login tab.
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
								The password must be at least 8 characters long and contain a mix of letters,
								numbers, and special characters. Your password will be handled encrypted and
								securely.
							</FieldDescription>
							{error === 'WEAK_PASSWORD' && (
								<FieldDescription className="text-destructive">
									Password must be at least 8 characters and include letters, numbers and a special
									character.
								</FieldDescription>
							)}
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
					<Button type="button" onClick={() => handleSubmit()}>
						Login
					</Button>
					<FieldDescription>
						After registering your account is pending until approved by an administrator.
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
