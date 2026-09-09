import { Can } from '@casl/react';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
	ServiceDto,
	ServiceStatusEnum,
	ServiceTypeEnum,
} from '@/src/app/api/dto/services/service.dto';
import { servicesService } from '@/src/app/api/services/services.service';
import { Alert, AlertDescription, AlertTitle } from '@/src/app/components/design-components/alert';
import { Badge } from '@/src/app/components/design-components/badge';
import { Button } from '@/src/app/components/design-components/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/src/app/components/design-components/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/src/app/components/design-components/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/src/app/components/design-components/select';
import { Spinner } from '@/src/app/components/design-components/spinner';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/src/app/components/design-components/table';
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/src/app/components/design-components/tabs';
import { useAuth } from '@/src/app/contexts/AuthContext';

interface ServiceDetailProps {
	namespace: string;
	name: string;
}

export default function ServiceDetail({ namespace, name }: ServiceDetailProps) {
	const { ability } = useAuth();
	const [service, setService] = useState<ServiceDto | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Logs state
	const [logs, setLogs] = useState<Array<{ podName: string; logs: string }>>([]);
	const [selectedPod, setSelectedPod] = useState<string>('all');
	const [logsLoading, setLogsLoading] = useState(false);

	// Action modal
	const [actionType, setActionType] = useState<'abort' | 'restart' | 'delete' | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const fetchServiceDetails = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await servicesService.getService(namespace, name);
			setService(data);
		} catch (err: unknown) {
			setError((err as Error)?.message || 'Failed to load service details.');
		} finally {
			setLoading(false);
		}
	};

	const fetchLogs = async () => {
		setLogsLoading(true);
		try {
			const podTarget = selectedPod !== 'all' ? selectedPod : undefined;
			const data = await servicesService.getServiceLogs(namespace, name, podTarget, 200);
			setLogs(data);
		} catch (err: unknown) {
			console.error('Failed to fetch service logs:', err);
		} finally {
			setLogsLoading(false);
		}
	};

	useEffect(() => {
		fetchServiceDetails();
	}, [namespace, name]);

	useEffect(() => {
		fetchLogs();
	}, [namespace, name, selectedPod]);

	const handleAction = async () => {
		if (!actionType) return;
		setActionLoading(true);
		try {
			if (actionType === 'abort') {
				await servicesService.abortService(namespace, name);
			} else if (actionType === 'restart') {
				await servicesService.restartService(namespace, name);
			} else if (actionType === 'delete') {
				await servicesService.deleteService(namespace, name);
			}
			setActionType(null);
			await fetchServiceDetails();
		} catch (err: unknown) {
			setError((err as Error)?.message || `Action ${actionType} failed.`);
		} finally {
			setActionLoading(false);
		}
	};

	const renderServiceTypeBadge = (type?: string) => {
		switch (type) {
			case ServiceTypeEnum.XML_INGESTOR:
				return (
					<Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">XML Ingestor</Badge>
				);
			case ServiceTypeEnum.MCP:
				return (
					<Badge className="bg-purple-100 text-purple-800 border-purple-300">MCP Service</Badge>
				);
			case ServiceTypeEnum.DOWNLOADER:
				return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Downloader</Badge>;
			default:
				return <Badge variant="outline">General</Badge>;
		}
	};

	const renderStatusBadge = (status?: string) => {
		switch (status) {
			case ServiceStatusEnum.RUNNING:
				return (
					<Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Running</Badge>
				);
			case ServiceStatusEnum.STOPPED:
				return <Badge className="bg-slate-100 text-slate-700 border-slate-300">Stopped</Badge>;
			case ServiceStatusEnum.PENDING:
				return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Pending</Badge>;
			case ServiceStatusEnum.FAILED:
				return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Failed</Badge>;
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-16">
				<Spinner className="w-8 h-8 text-primary" />
				<span className="ml-3 text-sm text-slate-500">Loading service details...</span>
			</div>
		);
	}

	if (error || !service) {
		return (
			<div className="space-y-4">
				<Link to="/services">
					<Button variant="outline" size="sm">
						&larr; Back to Services
					</Button>
				</Link>
				<Alert variant="destructive">
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error || 'Service not found.'}</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Top Header & Actions */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
				<div>
					<div className="flex items-center gap-3">
						<Link to="/services">
							<Button variant="ghost" size="sm">
								&larr; Services
							</Button>
						</Link>
						<h1 className="text-2xl font-bold text-slate-900">{service.name}</h1>
						{renderServiceTypeBadge(service.serviceType)}
						{renderStatusBadge(service.status)}
					</div>
					<p className="text-sm text-slate-500 mt-1">
						Namespace: <span className="font-semibold text-slate-700">{service.namespace}</span> |{' '}
						{service.description || 'Long-running application'}
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Can ability={ability} I="update" a="service">
						<Button variant="outline" onClick={() => setActionType('restart')}>
							{service.status === ServiceStatusEnum.STOPPED ? 'Start Service' : 'Restart Service'}
						</Button>
					</Can>

					<Can ability={ability} I="abort" a="service">
						{service.status === ServiceStatusEnum.RUNNING && (
							<Button variant="destructive" onClick={() => setActionType('abort')}>
								Abort / Stop
							</Button>
						)}
					</Can>

					<Can ability={ability} I="delete" a="service">
						<Button
							variant="outline"
							className="text-rose-600 border-rose-200 hover:bg-rose-50"
							onClick={() => setActionType('delete')}
						>
							Delete
						</Button>
					</Can>
				</div>
			</div>

			{/* Main Tabs */}
			<Tabs defaultValue="overview">
				<TabsList>
					<TabsTrigger value="overview">Overview & Pods</TabsTrigger>
					<TabsTrigger value="logs">Container Logs</TabsTrigger>
				</TabsList>

				{/* Overview Tab */}
				<TabsContent value="overview" className="space-y-6 pt-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-base font-semibold">Service Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Service Name:</span>
									<span className="font-medium text-slate-900">{service.name}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Namespace:</span>
									<span className="font-medium text-slate-900">{service.namespace}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Service Type:</span>
									<span>{renderServiceTypeBadge(service.serviceType)}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Container Image:</span>
									<span className="font-mono text-xs text-slate-800">{service.containerImage}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Created:</span>
									<span className="text-slate-800">
										{service.creationTimestamp
											? new Date(service.creationTimestamp).toLocaleString()
											: 'N/A'}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base font-semibold">Replica Status</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Target Replicas:</span>
									<span className="font-medium text-slate-900">{service.replicas}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Ready Replicas:</span>
									<span className="font-medium text-slate-900">{service.availableReplicas}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Current Health:</span>
									<span>{renderStatusBadge(service.status)}</span>
								</div>
								<div className="flex justify-between border-b pb-2">
									<span className="text-slate-500">Active Pod Count:</span>
									<span className="font-medium text-slate-900">{service.pods.length}</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Pods Table */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base font-semibold">Active Pods</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							{service.pods.length === 0 ? (
								<div className="py-8 text-center text-sm text-slate-500">
									No active pods running for this service (Replicas: {service.replicas}).
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Pod Name</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Node</TableHead>
											<TableHead>Restarts</TableHead>
											<TableHead>Started At</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{service.pods.map((pod) => (
											<TableRow key={pod.name}>
												<TableCell className="font-mono text-xs font-semibold text-slate-800">
													{pod.name}
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className={
															pod.status === 'Running'
																? 'border-emerald-500 text-emerald-700 bg-emerald-50'
																: 'border-amber-500 text-amber-700 bg-amber-50'
														}
													>
														{pod.status}
													</Badge>
												</TableCell>
												<TableCell className="text-xs text-slate-600">{pod.nodeName}</TableCell>
												<TableCell className="text-xs text-slate-800">{pod.restartCount}</TableCell>
												<TableCell className="text-xs text-slate-600">
													{pod.startedAt ? new Date(pod.startedAt).toLocaleString() : 'N/A'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Container Logs Tab */}
				<TabsContent value="logs" className="space-y-4 pt-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-slate-700">Select Pod:</span>
							<Select value={selectedPod} onValueChange={setSelectedPod}>
								<SelectTrigger className="w-[240px]">
									<SelectValue placeholder="All Pods" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Pods</SelectItem>
									{service.pods.map((p) => (
										<SelectItem key={p.name} value={p.name}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
							{logsLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
							Refresh Logs
						</Button>
					</div>

					<Card className="bg-slate-950 text-slate-100 border-slate-800 font-mono text-xs">
						<CardContent className="p-4 overflow-x-auto max-h-[500px]">
							{logsLoading ? (
								<div className="py-8 text-center text-slate-400">Loading container logs...</div>
							) : logs.length === 0 ? (
								<div className="py-8 text-center text-slate-500">No logs available.</div>
							) : (
								logs.map((item) => (
									<div key={item.podName} className="mb-4">
										<div className="text-slate-400 font-bold border-b border-slate-800 pb-1 mb-2">
											--- Pod: {item.podName} ---
										</div>
										<pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
											{item.logs}
										</pre>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Modal confirmation */}
			<Dialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Confirm{' '}
							{actionType === 'abort'
								? 'Abort / Stop'
								: actionType === 'restart'
									? 'Restart / Start'
									: 'Delete'}
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to {actionType}{' '}
							<span className="font-semibold text-slate-900">{service.name}</span> in namespace{' '}
							<span className="font-semibold text-slate-900">{service.namespace}</span>?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setActionType(null)} disabled={actionLoading}>
							Cancel
						</Button>
						<Button
							variant={
								actionType === 'abort' || actionType === 'delete' ? 'destructive' : 'default'
							}
							onClick={handleAction}
							disabled={actionLoading}
						>
							{actionLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
							Confirm {actionType}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
