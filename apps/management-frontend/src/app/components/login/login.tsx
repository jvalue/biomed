import { useRouter } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/src/app/contexts/AuthContext';

export function Login() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const { login } = useAuth();
	const router = useRouter();

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		try {
			await login(username, password);
			await router.navigate({ to: '/' });
		} catch (err) {
			setError('Login failed. Please check your credentials and try again.');
		}
	};

	return (
		<div className="login-container">
			<h1>Login</h1>
			<form onSubmit={handleSubmit}>
				<input
					type="text"
					placeholder="username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<input
					type="password"
					placeholder="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				{error && <div className="error">{error}</div>}
				<button type="submit">Log in</button>
			</form>
		</div>
	);
}
