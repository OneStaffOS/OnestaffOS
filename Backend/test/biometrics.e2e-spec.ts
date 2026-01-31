import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthGuard } from './../src/auth/middleware/authentication.middleware';
import { authorizationGaurd } from './../src/auth/middleware/authorization.middleware';

describe('Biometrics (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { employeeId: '000000000000000000000000', roles: ['System Admin'] };
          return true;
        },
      })
      .overrideGuard(authorizationGaurd)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('creates a biometrics challenge', () => {
    return request(app.getHttpServer())
      .post('/api/v1/biometrics/challenge')
      .send({ action: 'VERIFY' })
      .expect(201)
      .expect((res) => {
        expect(res.body.challengeId).toBeDefined();
        expect(res.body.nonce).toBeDefined();
        expect(res.body.publicKey).toBeDefined();
      });
  });
});
