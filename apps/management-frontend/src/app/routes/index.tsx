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
					<strong>Scheduling:</strong> Create and manage recurring or one-time crawl schedules.
				</li>
				<li>
					<strong>Parameterization:</strong> Define and modify crawler parameters.
				</li>
				<li>
					<strong>Insights &amp; Statistics:</strong> View run history, success/failure rates,
					durations, and resource usage, as well as insights regarding datasets and other crawler
					specific information.
				</li>
				<li>
					<strong>User &amp; Access Management:</strong> Fine-grained control over user roles and
					permissions.
				</li>
			</ul>

			<h2 className="text-xl mt-6">Getting Started</h2>
			<ol className="list-decimal pl-5 mt-2 space-y-2">
				<li>Create a new crawler definition with input parameters and target sources.</li>
				<li>Define a schedule or trigger for automatic runs.</li>
				<li>Monitor the first runs in the Runs/History view to validate results.</li>
				<li>Invite users and assign roles according to access needs.</li>
			</ol>

			<p className="mt-6 text-gray-600">
				Note: This is a static informational start page. Interactive management screens (scheduling
				UI, run details, user settings) will be available once the application components are
				implemented.
			</p>

			<footer className="mt-10 text-gray-500 text-sm">
				Crawler Management • Still under development
			</footer>
		</div>
	);
}
