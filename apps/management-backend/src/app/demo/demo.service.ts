import { Injectable } from '@nestjs/common';

@Injectable()
export class DemoService {
	getData(): { message: string } {
		return { message: 'Hello API Demo6' };
	}
}
