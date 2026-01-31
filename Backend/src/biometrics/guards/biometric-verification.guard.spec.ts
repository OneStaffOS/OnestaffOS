import { BiometricVerificationGuard } from './biometric-verification.guard';
describe('BiometricVerificationGuard', () => {
  const buildContext = (body: any, headers: any, user: any) => ({
    switchToHttp: () => ({
      getRequest: () => ({ body, headers, user }),
    }),
  });

  it('allows non-clock-in punches without token', async () => {
    const guard = new BiometricVerificationGuard({} as any);
    const result = await guard.canActivate(buildContext({ type: 'OUT' }, {}, { employeeId: '1' }) as any);
    expect(result).toBe(true);
  });

  it('blocks clock-in without token', async () => {
    const guard = new BiometricVerificationGuard({} as any);
    await expect(
      guard.canActivate(buildContext({ type: 'IN' }, {}, { employeeId: '1' }) as any),
    ).rejects.toThrow('Biometric verification token required');
  });

  it('accepts valid token and marks it used', async () => {
    process.env.BIOMETRIC_VERIFICATION_SECRET = 'test-secret';
    const event = { verificationTokenUsedAt: undefined, save: jest.fn() };
    const model = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(event) }),
    } as any;
    const guard = new BiometricVerificationGuard(model);

    const result = await guard.canActivate(
      buildContext(
        { type: 'IN' },
        { 'x-biometric-verification': 'token' },
        { employeeId: '1' },
      ) as any,
    );

    expect(result).toBe(true);
    expect(event.save).toHaveBeenCalled();
  });
});
