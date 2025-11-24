import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Demo')
export class DemoEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ unique: false, nullable: false })
	title!: string;
}
