import { SetMetadata } from '@nestjs/common';

export const ADMIN_PIN_BYPASS_KEY = process.env.ADMIN_PIN_BYPASS_KEY || 'adminPinBypass';

export const AdminPinBypass = () => SetMetadata(ADMIN_PIN_BYPASS_KEY, true);
