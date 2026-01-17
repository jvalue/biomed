import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ScheduleEntity } from '../../../schedules/entity/schedule.entity';

@Entity('crawler_run_metrics')
export class CrawlerRunMetricEntity {
	@PrimaryColumn()
	runId!: string;

	@Column({ type: 'varchar', nullable: true, name: 'schedule_name' })
	scheduleName?: string;

	@Column({ type: 'varchar', nullable: true, name: 'schedule_namespace' })
	scheduleNamespace?: string;

	@ManyToOne(() => ScheduleEntity, { nullable: true, onDelete: 'SET NULL', eager: false })
	@JoinColumn([
		{ name: 'schedule_name', referencedColumnName: 'name' },
		{ name: 'schedule_namespace', referencedColumnName: 'namespace' },
	])
	schedule?: ScheduleEntity;

	@Column({
		type: 'int',
		nullable: true,
	})
	crawledDataSets?: number;

	@Column({
		type: 'int',
		nullable: true,
		comment: 'Number of cache hits during this crawler run (regarding datasets)',
	})
	cacheHits?: number;
}
