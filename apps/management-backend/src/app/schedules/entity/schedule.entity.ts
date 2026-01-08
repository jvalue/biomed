import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	PrimaryColumn,
} from 'typeorm';
import { TargetEntity } from '../../health/targets/entity/target.entity';
import { UserEntity } from '../../users/entity/user.entity';

// We store the schedules, which are created over our management service, in this table. It is not guaranteed, that
// these are all schedules
@Entity('schedules')
export class ScheduleEntity {
	@PrimaryColumn()
	name: string;

	@PrimaryColumn()
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

	@CreateDateColumn()
	createdAt: Date;
}
