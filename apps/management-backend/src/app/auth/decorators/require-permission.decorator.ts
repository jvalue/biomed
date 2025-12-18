import { SetMetadata } from '@nestjs/common';
import { Actions, Subjects } from '../types/ability.types';

export const RequirePermission = (action: Actions, subject: Subjects) =>
	SetMetadata('permission', { action, subject });
