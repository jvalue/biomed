import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, } from 'typeorm';
import { UserEntity } from '../../users/entity/user.entity';

@Entity('api_keys')
export class ApiKeyEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ unique: true, type: 'varchar' })
	hash: string; // SHA-256 hash of the API key

	@Column({ type: 'varchar' })
	prefix: string; //First 8 characters of the API key for identification

	@Column({ type: 'varchar' })
	description: string;

	@Column({ default: true, type: 'boolean' })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@Column({ nullable: true, type: 'timestamp' })
	lastUsedAt: Date;

	@Column({ name: 'created_by_id' , type: 'varchar'})
	createdById: string;

	@ManyToOne(() => UserEntity, { nullable: true, onDelete: 'NO ACTION' })
	@JoinColumn({ name: 'created_by_id', referencedColumnName: 'id' })
	createdBy: UserEntity;
}
