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
import { useAuth } from '@/src/app/contexts/AuthContext';
import { Input } from '../design-components/input';

type registerError = 'NONE' | 'UNKNOWN' | 'WEAK_PASSWORD' | 'CONFLICT';

export function RegisterFormComponent() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<registerError>('NONE');
	const [isRegistered, setIsRegistered] = useState(false);
	const { register } = useAuth();

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
			setIsRegistered(true);
			// biome-ignore lint/suspicious/noExplicitAny: <doesn't work differently>
		} catch (err: any) {
			if (err.response?.status === 409) {
				setError('CONFLICT');
			} else {
				setError('UNKNOWN');
			}
		}
	};

	return (
		<div>
			{isRegistered ? (
				<FieldGroup>
					<FieldDescription>
						Registration successful! <br />
						Your account is pending approval by an administrator.
						<br />
						To see if your account has been approved, please try to log in later.
					</FieldDescription>
				</FieldGroup>
			) : (
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<FieldSet>
							<FieldLegend>Register</FieldLegend>
							<FieldDescription>
								Please enter your username and password to create a new account. If you already have
								an account, please switch to the "Login" tab.
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
									{error === 'CONFLICT' && (
										<FieldDescription className="text-destructive">
											Username already exists. Please choose a different one.
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
											Password must be at least 8 characters and include letters, numbers and a
											special character.
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
								Register
							</Button>
							<FieldDescription>
								After registering your account is pending until approved by an administrator.
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>
			)}
		</div>
	);
}
