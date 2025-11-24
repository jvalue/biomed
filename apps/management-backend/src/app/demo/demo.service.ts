import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemoEntity } from './entity/demo.entity';

@Injectable()
export class DemoService {
	constructor(
		@InjectRepository(DemoEntity)
		private readonly demoRepository: Repository<DemoEntity>,
	) {}

	getDemoData(): Promise<DemoEntity[]> {
		return this.demoRepository.find();
	}

	createDemoItem(title: string): Promise<DemoEntity> {
		const demoItem = new DemoEntity();
		demoItem.title = title;
		return this.demoRepository.save(demoItem);
	}
}
