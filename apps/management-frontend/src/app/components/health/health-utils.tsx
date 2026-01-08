import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ReactElement } from 'react';
import { Badge } from '@/src/app/components/design-components/badge';
import { HealthStatusEnum } from '../../api/dto/health/healthStatus.enum';

// Shared helpers for health components
export const getStatusIcon = (status?: HealthStatusEnum): ReactElement => {
	switch (status) {
		case HealthStatusEnum.AVAILABLE:
			return <CheckCircle2 className="w-6 h-6 text-green-600" />;
		case HealthStatusEnum.LIMITED:
			return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
		case HealthStatusEnum.DOWN:
			return <XCircle className="w-6 h-6 text-red-600" />;
		default:
			return <AlertTriangle className="w-6 h-6 text-gray-400" />;
	}
};

export const getStatusBadge = (status?: HealthStatusEnum): ReactElement => {
	switch (status) {
		case HealthStatusEnum.AVAILABLE:
			return (
				<Badge className="bg-green-100 text-green-800 border border-green-300">Available</Badge>
			);
		case HealthStatusEnum.LIMITED:
			return (
				<Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">Limited</Badge>
			);
		case HealthStatusEnum.DOWN:
			return <Badge className="bg-red-100 text-red-800 border border-red-300">Down</Badge>;
		default:
			return <Badge variant="outline">Unknown</Badge>;
	}
};

export const getStatusColor = (status?: HealthStatusEnum): string => {
	switch (status) {
		case HealthStatusEnum.AVAILABLE:
			return 'border-l-green-500';
		case HealthStatusEnum.LIMITED:
			return 'border-l-yellow-500';
		case HealthStatusEnum.DOWN:
			return 'border-l-red-500';
		default:
			return 'border-l-gray-400';
	}
};

export const getServerStatus = (status?: HealthStatusEnum): string => {
	if (status === HealthStatusEnum.AVAILABLE) return 'Reachable';
	if (status === HealthStatusEnum.LIMITED) return 'Degraded';
	return 'Unreachable';
};
