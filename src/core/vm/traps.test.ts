// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createTrap } from './traps';

describe('createTrap', () => {
    it('preserves the stable code and message', () => {
        const trap = createTrap('DIVISION_BY_ZERO', 'Division by zero.');

        expect(trap).toEqual({
            code: 'DIVISION_BY_ZERO',
            message: 'Division by zero.',
        });
    });
});
