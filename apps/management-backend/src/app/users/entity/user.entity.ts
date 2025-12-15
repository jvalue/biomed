import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { UserPermission } from '../../auth/enums/user-permission.enum';
import { UserStatus } from '../../auth/enums/user-status.enum';

@Entity('users')
export class UserEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true })
	username: string;

	@Column()
	passwordHash: string;

	@Column({
		type: 'simple-array',
		default: '',
	})
	permissions: UserPermission[];

	@Column({
		type: 'enum',
		enum: UserStatus,
		default: UserStatus.PENDING,
	})
	status: UserStatus;

	@Column({ nullable: true })
	approvedBy?: string;

	@Column({ type: 'timestamp', nullable: true })
	approvedAt?: Date;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
