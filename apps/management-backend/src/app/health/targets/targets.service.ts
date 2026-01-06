import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entity/user.entity';
import { TargetEntity } from './entity/target.entity';

@Injectable()
export class TargetsService {
	constructor(
		@InjectRepository(TargetEntity)
		private readonly targetsRepository: Repository<TargetEntity>,
	) {}

	/**
	 * Find all target URLs
	 */
	findAllTargets(): Promise<TargetEntity[]> {
		return this.targetsRepository.find();
	}

	/**
	 * Create a target if it does not exist
	 * @param url The target URL
	 * @param user The user creating the target (optional), set only if created manually
	 */
	async createTargetIfNotExists(url: string, user?: UserEntity): Promise<TargetEntity> {
		let target: TargetEntity = await this.targetsRepository.findOne({ where: { url } });
		if (!target) {
			target = new TargetEntity();
			target.url = url;
			target.displayName = this.getHostNameFromUrl(url) || url;
			if (user) {
				target.createdBy = user;
			}
			target = await this.targetsRepository.save(target);
		}
		return target;
	}

	/**
	 * Delete a target if it is unreferenced by any schedules
	 * @param url
	 */
	async deleteTargetIfUnreferenced(url: string): Promise<void> {
		const target: TargetEntity | null = await this.targetsRepository.findOne({
			where: { url },
			relations: ['schedules'],
		});
		if (target && (!target.schedules || target.schedules.length === 0)) {
			await this.targetsRepository.remove(target);
		}
	}

	/**
	 * Get the host name from a URL or null if the URL is invalid
	 * @param url
	 */
	getHostNameFromUrl(url: string): string | null {
		try {
			const parsedUrl = new URL(url);
			return parsedUrl.hostname;
		} catch (_error) {
			return null;
		}
	}
}
