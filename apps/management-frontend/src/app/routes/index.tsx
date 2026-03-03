import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="p-6 max-w-[900px] mx-auto font-sans leading-relaxed">
			<h1 className="text-4xl mb-2">Crawler Management — Welcome</h1>

			<p className="text-gray-700">
				This application helps you manage crawlers in a single place. Use it to schedule runs,
				configure parameters, monitor execution, and manage access for individual users.
			</p>

			<h2 className="text-xl mt-6">Core Capabilities</h2>
			<ul className="list-disc pl-5 mt-2 space-y-2">
				<li>
					<strong>Scheduling:</strong> Create and manage recurring executions for crawler templates
					with parametrization and retry strategy.
				</li>
				<li>
					<strong>Starting runs:</strong> Start parametrized runs for crawler templates on demand,
					with the ability to override default parameters.
				</li>
				<li>
					<strong>Statistics:</strong> View run history, success/failure rates, durations, and
					statistics regarding retrieved datasets.
				</li>
				<li>
					<strong>Run Insights:</strong> See run insights such as crawling and download progress,
					retrived datasets and live events from the crawler.
				</li>
				<li>
					<strong>User &amp; Access Management:</strong> Fine-grained control over user permissions.
				</li>
				<li>
					<strong>Health Overview:</strong> See the system's health status as well as the
					availability of target URLs for the crawlers.
				</li>
			</ul>

			<h2 className="text-xl mt-6">Getting Started</h2>
			<ol className="list-decimal pl-5 mt-2 space-y-2">
				<li>
					Go to crawler-templates and find a crawler template for which you want to create a
					schedule.
				</li>
				<li>
					Create a schedule and define the cron expression as well as parameters and the retry
					strategy if needed.
				</li>
				<li>Wait for the first runs to occur and monitor their progress.</li>
				<li>Check in again after a few runs and view the statistics of your schedule.</li>
			</ol>

			<p className="mt-6 text-gray-600">
				Note: If you're not able to see specific pages, such as crawler-templates, schedules or
				crawler-runs, you probably do not have permissions to view them. Contact your administrator
				for access.
			</p>

			<footer className="mt-10 text-gray-500 text-sm">
				Crawler Management • Still under development
			</footer>
		</div>
	);
}
