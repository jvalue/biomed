import { Outlet } from '@tanstack/react-router';
import { Snowfall } from 'react-snowfall';
import { ToastContainer } from 'react-toastify';
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
				<ToastContainer
					position="top-right"
					autoClose={5000}
					hideProgressBar={false}
					newestOnTop={false}
					closeOnClick
					pauseOnHover={true}
				/>
			</div>
		</AuthProvider>
	);
}
