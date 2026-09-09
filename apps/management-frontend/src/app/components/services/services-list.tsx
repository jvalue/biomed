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
import { Input } from '@/src/app/components/design-components/input';
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
import { useAuth } from '@/src/app/contexts/AuthContext';

export default function ServicesList() {
	const { ability } = useAuth();
	const [services, setServices] = useState<ServiceDto[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filters
	const [searchTerm, setSearchTerm] = useState('');
	const [typeFilter, setTypeFilter] = useState<string>('all');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [namespaceFilter, setNamespaceFilter] = useState<string>('all');
	const [knownNamespaces, setKnownNamespaces] = useState<string[]>([
		'crawler-management',
		'default',
	]);

	// Modal action states
	const [actionTarget, setActionTarget] = useState<ServiceDto | null>(null);
	const [actionType, setActionType] = useState<'abort' | 'restart' | 'delete' | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const fetchServices = async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await servicesService.getServices({
				search: searchTerm || undefined,
				serviceType: typeFilter !== 'all' ? typeFilter : undefined,
				status: statusFilter !== 'all' ? statusFilter : undefined,
				namespace: namespaceFilter !== 'all' ? namespaceFilter : undefined,
			});
			setServices(data);

			// Extract unique namespaces to populate filter choices dynamically
			const namespaces = Array.from(new Set(data.map((s) => s.namespace))).filter(Boolean);
			setKnownNamespaces((prev) => Array.from(new Set([...prev, ...namespaces])));
		} catch (err: unknown) {
			setError((err as Error)?.message || 'Failed to fetch long-running services.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchServices();
	}, [searchTerm, typeFilter, statusFilter, namespaceFilter]);

	const handleExecuteAction = async () => {
		if (!actionTarget || !actionType) return;
		setActionLoading(true);
		try {
			if (actionType === 'abort') {
				await servicesService.abortService(actionTarget.namespace, actionTarget.name);
			} else if (actionType === 'restart') {
				await servicesService.restartService(actionTarget.namespace, actionTarget.name);
			} else if (actionType === 'delete') {
				await servicesService.deleteService(actionTarget.namespace, actionTarget.name);
			}
			setActionTarget(null);
			setActionType(null);
			await fetchServices();
		} catch (err: unknown) {
			setError((err as Error)?.message || `Failed to perform ${actionType} action.`);
		} finally {
			setActionLoading(false);
		}
	};

	// Metrics summary
	const totalCount = services.length;
	const runningCount = services.filter((s) => s.status === ServiceStatusEnum.RUNNING).length;
	const stoppedCount = services.filter((s) => s.status === ServiceStatusEnum.STOPPED).length;
	const issueCount = services.filter(
		(s) => s.status === ServiceStatusEnum.FAILED || s.status === ServiceStatusEnum.PENDING,
	).length;

	const renderServiceTypeBadge = (type: ServiceTypeEnum | string) => {
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

	const renderStatusBadge = (status: ServiceStatusEnum | string) => {
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

	return (
		<div className="space-y-6">
			{/* Metric Summary Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-slate-500">Total Services</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-slate-900">{totalCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-emerald-600">Running Services</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-emerald-700">{runningCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-slate-500">Stopped / Aborted</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-slate-700">{stoppedCount}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-amber-600">Pending / Issues</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-amber-700">{issueCount}</div>
					</CardContent>
				</Card>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Filter Controls */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex-1 max-w-sm">
							<Input
								placeholder="Search services by name or description..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Namespace" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Namespaces</SelectItem>
									{knownNamespaces.map((ns) => (
										<SelectItem key={ns} value={ns}>
											{ns}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="Service Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value={ServiceTypeEnum.XML_INGESTOR}>XML Ingestor</SelectItem>
									<SelectItem value={ServiceTypeEnum.MCP}>MCP Services</SelectItem>
									<SelectItem value={ServiceTypeEnum.DOWNLOADER}>Downloader</SelectItem>
									<SelectItem value={ServiceTypeEnum.GENERAL}>General</SelectItem>
								</SelectContent>
							</Select>

							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Statuses</SelectItem>
									<SelectItem value={ServiceStatusEnum.RUNNING}>Running</SelectItem>
									<SelectItem value={ServiceStatusEnum.STOPPED}>Stopped</SelectItem>
									<SelectItem value={ServiceStatusEnum.PENDING}>Pending</SelectItem>
									<SelectItem value={ServiceStatusEnum.FAILED}>Failed</SelectItem>
								</SelectContent>
							</Select>

							<Button variant="outline" onClick={fetchServices} disabled={loading}>
								Refresh
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Data Table */}
			<Card>
				<CardContent className="p-0">
					{loading ? (
						<div className="flex justify-center items-center py-12">
							<Spinner className="w-8 h-8 text-primary" />
							<span className="ml-3 text-sm text-slate-500">Loading long-running services...</span>
						</div>
					) : services.length === 0 ? (
						<div className="text-center py-12 text-slate-500">
							No services found matching the criteria.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Service Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Namespace</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Replicas / Pods</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{services.map((svc) => (
									<TableRow key={`${svc.namespace}/${svc.name}`}>
										<TableCell className="font-medium">
											<Link
												to="/services/$serviceNamespace/$serviceName"
												params={{ serviceNamespace: svc.namespace, serviceName: svc.name }}
												className="text-primary hover:underline font-semibold"
											>
												{svc.name}
											</Link>
											{svc.description && (
												<div className="text-xs text-slate-500">{svc.description}</div>
											)}
										</TableCell>
										<TableCell>{renderServiceTypeBadge(svc.serviceType)}</TableCell>
										<TableCell className="text-sm text-slate-600">{svc.namespace}</TableCell>
										<TableCell>{renderStatusBadge(svc.status)}</TableCell>
										<TableCell className="text-sm">
											{svc.availableReplicas} / {svc.replicas} ready ({svc.pods.length} pod
											{svc.pods.length !== 1 ? 's' : ''})
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-2">
												<Link
													to="/services/$serviceNamespace/$serviceName"
													params={{ serviceNamespace: svc.namespace, serviceName: svc.name }}
												>
													<Button variant="outline" size="sm">
														Details & Logs
													</Button>
												</Link>

												<Can ability={ability} I="update" a="service">
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setActionTarget(svc);
															setActionType('restart');
														}}
													>
														{svc.status === ServiceStatusEnum.STOPPED ? 'Start' : 'Restart'}
													</Button>
												</Can>

												<Can ability={ability} I="abort" a="service">
													{svc.status === ServiceStatusEnum.RUNNING && (
														<Button
															variant="destructive"
															size="sm"
															onClick={() => {
																setActionTarget(svc);
																setActionType('abort');
															}}
														>
															Abort / Stop
														</Button>
													)}
												</Can>

												<Can ability={ability} I="delete" a="service">
													<Button
														variant="outline"
														size="sm"
														className="text-rose-600 hover:bg-rose-50"
														onClick={() => {
															setActionTarget(svc);
															setActionType('delete');
														}}
													>
														Delete
													</Button>
												</Can>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Action Confirmation Modal */}
			<Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Confirm{' '}
							{actionType === 'abort'
								? 'Abort / Stop'
								: actionType === 'restart'
									? 'Restart / Start'
									: 'Delete'}{' '}
							Service
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to {actionType}{' '}
							<span className="font-semibold text-slate-900">{actionTarget?.name}</span> in
							namespace{' '}
							<span className="font-semibold text-slate-900">{actionTarget?.namespace}</span>?
							{actionType === 'abort' &&
								' This will scale down active replicas to 0 and terminate running workloads.'}
							{actionType === 'delete' && ' This will remove the service resource permanently.'}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setActionTarget(null)}
							disabled={actionLoading}
						>
							Cancel
						</Button>
						<Button
							variant={
								actionType === 'abort' || actionType === 'delete' ? 'destructive' : 'default'
							}
							onClick={handleExecuteAction}
							disabled={actionLoading}
						>
							{actionLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
							Confirm{' '}
							{actionType === 'abort' ? 'Abort' : actionType === 'restart' ? 'Restart' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
