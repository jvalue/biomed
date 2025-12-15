// Define the possible actions that can be performed in the system
import { PureAbility } from '@casl/ability';

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'block';

// Define the possible subjects (resources) in the system
export type Subjects = 'workflow' | 'template' | 'user';

export type AppAbility = PureAbility<[Actions, Subjects]>;
