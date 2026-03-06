import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { getRouter } from './app/router';
import ErrorBoundary from "./app/contexts/ErrorBoundary";
import { TooltipProvider } from "./app/components/design-components/tooltip";

const queryClient = new QueryClient();
const router = getRouter();

const root = createRoot(document.getElementById('root')!);
root.render(
	<StrictMode>
		<ErrorBoundary>
			<TooltipProvider>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router}/>
				</QueryClientProvider>
			</TooltipProvider>
		</ErrorBoundary>
	</StrictMode>,
);
