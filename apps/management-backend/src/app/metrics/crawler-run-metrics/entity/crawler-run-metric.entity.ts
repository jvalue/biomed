import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { ScheduleEntity } from '../../../schedules/entity/schedule.entity';
import { CrawlerRunEventEntity } from './crawler-run-event.entity';

@Entity('crawler_run_metrics')
export class CrawlerRunMetricEntity {
	@PrimaryColumn({ type: 'varchar' })
	runId!: string;

	@PrimaryColumn({ type: 'varchar' })
	runNamespace!: string;

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

	@Column({
		type: 'int',
		nullable: true,
		comment: 'Progress of the crawler run (0-100)',
	})
	progress?: number;

	@OneToMany(
		() => CrawlerRunEventEntity,
		(e) => e.run,
		{ eager: false },
	)
	events?: CrawlerRunEventEntity[];
}
