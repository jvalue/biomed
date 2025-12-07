import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { getRouter } from './app/router';

const queryClient = new QueryClient();
const router = getRouter();

const root = createRoot(document.getElementById('root')!);
root.render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
