import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
} from 'typeorm';
import { TargetEntity } from '../../health/targets/entity/target.entity';
import { CrawlerRunMetricEntity } from '../../metrics/crawler-run-metrics/entity/crawler-run-metric.entity';
import { UserEntity } from '../../users/entity/user.entity';
import { ScheduleErrorDetails, ScheduleErrorType } from '../enums/schedule-error-type.enum';

// We store the schedules, which are created over our management service, in this table. It is not guaranteed, that
// these are all schedules
@Entity('schedules')
export class ScheduleEntity {
	@PrimaryColumn({ type: 'varchar' })
	name: string;

	@PrimaryColumn({ type: 'varchar' })
	namespace: string;

	@Column({ type: 'varchar' })
	crawlerTemplateName: string;

	@ManyToOne(() => UserEntity, { nullable: true, onDelete: 'NO ACTION' })
	@JoinColumn({ name: 'createdById' })
	createdBy?: UserEntity;

	@Column({ type: 'boolean', default: false })
	suspended: boolean;

	@ManyToMany(
		() => TargetEntity,
		(target) => target.schedules,
		{ cascade: ['insert'] },
	)
	@JoinTable({
		name: 'schedules_targets',
		joinColumns: [
			{ name: 'schedule_name', referencedColumnName: 'name' },
			{ name: 'schedule_namespace', referencedColumnName: 'namespace' },
		],
		inverseJoinColumns: [{ name: 'target_id', referencedColumnName: 'id' }],
	})
	targets?: TargetEntity[];

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt: Date;

	/**
	 * The last checked template version label (regarding parameter inconsistencies between schedule and template), to
	 * avoid checking the same version multiple times
	 */
	@Column({ type: 'varchar', nullable: true })
	lastCheckedTemplateVersionLabel?: string | null;

	/**
	 * A map of active errors for this schedule
	 */
	@Column({ type: 'jsonb', default: {} })
	activeErrors: Record<ScheduleErrorType, ScheduleErrorDetails>;

	// All metrics related to runs of this schedule
	@OneToMany(
		() => CrawlerRunMetricEntity,
		(m) => m.schedule,
		{ eager: false },
	)
	metrics?: CrawlerRunMetricEntity[];
}
