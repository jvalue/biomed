import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CrawlerRunEventTypeEnum } from '../enums/crawler-run-event-type.enum';
import { CrawlerRunMetricEntity } from './crawler-run-metric.entity';

@Entity('crawler_run_events')
export class CrawlerRunEventEntity {
	@PrimaryGeneratedColumn('uuid', { name: 'id' })
	id!: string;

	@Column({ name: 'run_id', type: 'varchar' })
	runId!: string;

	@Column({ name: 'run_namespace', type: 'varchar' })
	runNamespace!: string;

	@ManyToOne(
		() => CrawlerRunMetricEntity,
		(r) => r.events,
		{ nullable: false, onDelete: 'CASCADE', eager: false },
	)
	@JoinColumn([
		{ name: 'run_id', referencedColumnName: 'runId' },
		{ name: 'run_namespace', referencedColumnName: 'runNamespace' },
	])
	run!: CrawlerRunMetricEntity;

	// Type of the crawler run event
	@Column({ type: 'enum', enum: CrawlerRunEventTypeEnum, name: 'type' })
	type!: CrawlerRunEventTypeEnum;

	@Column({ type: 'text', name: 'message' })
	message!: string;

	@Column({ type: 'timestamp with time zone', name: 'timestamp' })
	timestamp!: Date;
}
