import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KubernetesClientService } from '../kubernetes-client/kubernetes-client.service';
import { ServiceStatusEnum, ServiceTypeEnum } from './dto/service.dto';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
	let service: ServicesService;
	let k8sClientServiceMock: Partial<KubernetesClientService>;

	beforeEach(async () => {
		k8sClientServiceMock = {
			getAppsV1: vi.fn().mockImplementation(() => {
				throw new Error('No K8s cluster');
			}),
			getCoreV1: vi.fn().mockImplementation(() => {
				throw new Error('No K8s cluster');
			}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ServicesService,
				{
					provide: KubernetesClientService,
					useValue: k8sClientServiceMock,
				},
			],
		}).compile();

		service = module.get<ServicesService>(ServicesService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should list fallback services including xml-ingestor, mcp, and downloader', async () => {
		const services = await service.listServices();
		expect(services.length).toBeGreaterThanOrEqual(4);

		const xmlSvc = services.find((s) => s.name === 'xml-ingestor');
		expect(xmlSvc).toBeDefined();
		expect(xmlSvc?.serviceType).toBe(ServiceTypeEnum.XML_INGESTOR);
		expect(xmlSvc?.status).toBe(ServiceStatusEnum.RUNNING);

		const mcpSvc = services.find((s) => s.name === 'postgres-mcp');
		expect(mcpSvc).toBeDefined();
		expect(mcpSvc?.serviceType).toBe(ServiceTypeEnum.MCP);
	});

	it('should filter services by serviceType', async () => {
		const mcpServices = await service.listServices({ serviceType: ServiceTypeEnum.MCP });
		expect(mcpServices.every((s) => s.serviceType === ServiceTypeEnum.MCP)).toBe(true);
		expect(mcpServices.length).toBe(2); // postgres-mcp and s3-mcp
	});

	it('should filter services by search term', async () => {
		const searchResults = await service.listServices({ search: 'xml' });
		expect(searchResults.length).toBe(1);
		expect(searchResults[0].name).toBe('xml-ingestor');
	});

	it('should get service by namespace and name', async () => {
		const svc = await service.getService('crawler-management', 'xml-ingestor');
		expect(svc.name).toBe('xml-ingestor');
		expect(svc.namespace).toBe('crawler-management');
	});

	it('should throw NotFoundException for unknown service', async () => {
		await expect(service.getService('crawler-management', 'non-existent')).rejects.toThrow(
			NotFoundException,
		);
	});

	it('should abort (stop) a running service', async () => {
		const aborted = await service.abortService('crawler-management', 'xml-ingestor');
		expect(aborted.status).toBe(ServiceStatusEnum.STOPPED);
		expect(aborted.replicas).toBe(0);
		expect(aborted.availableReplicas).toBe(0);
	});

	it('should restart a stopped service', async () => {
		await service.abortService('crawler-management', 'xml-ingestor');
		const restarted = await service.restartService('crawler-management', 'xml-ingestor');
		expect(restarted.status).toBe(ServiceStatusEnum.RUNNING);
		expect(restarted.replicas).toBe(1);
		expect(restarted.pods.length).toBeGreaterThan(0);
	});

	it('should delete a service', async () => {
		await service.deleteService('crawler-management', 'xml-ingestor');
		await expect(service.getService('crawler-management', 'xml-ingestor')).rejects.toThrow(
			NotFoundException,
		);
	});

	it('should retrieve logs for a service', async () => {
		const logs = await service.getServiceLogs('crawler-management', 's3-mcp');
		expect(logs.length).toBeGreaterThan(0);
		expect(logs[0].logs).toContain("Starting long-running service 's3-mcp'");
	});
});
