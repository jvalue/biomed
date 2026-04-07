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
	 * Find all targets with not suspended schedules
	 */
	async findAllActiveTargets(): Promise<TargetEntity[]> {
		return this.targetsRepository
			.createQueryBuilder('target')
			.innerJoinAndSelect('target.schedules', 'schedule', 'schedule.suspended = :suspended', {
				suspended: false,
			})
			.getMany();
	}

	/**
	 * Create a target if it does not exist
	 * @param url The target URL
	 * @param user The user creating the target (optional), set only if created manually
	 */
	async createTargetIfNotExists(url: string, user?: UserEntity): Promise<TargetEntity | undefined> {
		// Validate URL and return undefined if invalid
		if (!this.isValidUrl(url)) return;
		// Try to find an existing target first
		const target = await this.targetsRepository.findOneBy({ url });
		if (target) return target;
		const displayName = this.getHostNameFromUrl(url) ?? url;

		//Try to find by display name
		const targetByDisplayName = await this.targetsRepository.findOneBy({ displayName });
		if (targetByDisplayName) return targetByDisplayName;

		// Create new entity
		const newTarget = this.targetsRepository.create({
			url,
			displayName,
			createdBy: user,
		});

		// Save and handle possible race condition: if another process created the
		// same target concurrently, the save may fail. In that case, re-query and
		// return the existing one instead of throwing.
		try {
			return await this.targetsRepository.save(newTarget);
		} catch (_err) {
			// Return existing target if found
			const existing = await this.targetsRepository.findOneBy({ url });
			if (existing) return existing;
			// If nothing found, rethrow the original error
			throw _err;
		}
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
	private getHostNameFromUrl(url: string): string | null {
		try {
			const parsedUrl = new URL(url);
			return parsedUrl.hostname;
		} catch {
			return null;
		}
	}

	/**
	 * Validate if a URL is well-formed
	 * @param url
	 */
	isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	async findTargetsBySchedule(namespace: string, name: string): Promise<TargetEntity[]> {
		return this.targetsRepository
			.createQueryBuilder('target')
			.innerJoinAndSelect(
				'target.schedules',
				'schedule',
				'schedule.namespace = :namespace AND schedule.name = :name',
				{ namespace, name },
			)
			.getMany();
	}
}
