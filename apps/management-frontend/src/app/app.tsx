import { Outlet } from '@tanstack/react-router';
import { Snowfall } from 'react-snowfall';
import { AuthProvider } from '@/src/app/contexts/AuthContext';
import { AppNav } from './app-nav';

export default function App() {
	return (
		<AuthProvider>
			<div className="app">
				<Snowfall />
				<AppNav>
					<Outlet />
				</AppNav>
			</div>
		</AuthProvider>
	);
}
