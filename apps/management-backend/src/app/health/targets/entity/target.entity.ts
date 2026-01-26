import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToMany,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { ScheduleEntity } from '../../../schedules/entity/schedule.entity';
import { UserEntity } from '../../../users/entity/user.entity';

/**
 * Targets are the endpoints which are monitored. These can be created manually by users or
 * automatically created when a schedule is created which references a target not yet existing.
 */
@Entity('targets')
export class TargetEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({
		type: 'varchar',
		unique: true,
	})
	displayName: string;

	@Column({
		type: 'varchar',
		unique: true,
	})
	url: string;

	// Set if manually created by a user
	@ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
	@JoinColumn({ name: 'createdById' })
	createdBy?: UserEntity | null;

	@ManyToMany(
		() => ScheduleEntity,
		(s) => s.targets,
	)
	schedules?: ScheduleEntity[];

	@CreateDateColumn({ type: 'timestamptz' })
	createdAt: Date;

	@UpdateDateColumn({ type: 'timestamptz' })
	updatedAt: Date;
}
