import { DevCycleUser } from '@devcycle/nodejs-server-sdk';

declare module 'express-serve-static-core' {
  interface Request {
    user: DevCycleUser;
  }
}
