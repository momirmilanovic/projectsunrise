import { resolve } from 'node:path';

import { AUTH_DIR } from './env.js';

export const ACTORS = {
  regularUser: {
    id: 'regularUser',
    email: process.env.TESTA_EMAIL ?? 'atester.atesterson@mail.com',
    passwordVar: 'TESTERA_PASSWORD',
    statePath: resolve(AUTH_DIR, 'regularUser.json'),
  },
  secondUser: {
    id: 'secondUser',
    email: process.env.TESTA_EMAIL ?? 'btester.btesterson@mail.com',
    passwordVar: 'TESTERB_PASSWORD',
    statePath: resolve(AUTH_DIR, 'secondUser.json'),
  },
  guest: {
    id: 'guest',
    email: null,
    passwordVar: null,
    statePath: null,
  },
};

export const AUTHENTICATED_ACTORS = [ACTORS.regularUser, ACTORS.secondUser];

export function passwordFor(actor) {
  const password = process.env[actor.passwordVar];
  if (!password) {
    throw new Error(
      `${actor.passwordVar} is not set, so ${actor.id} (${actor.email}) cannot sign in. ` +
        `Add ${actor.passwordVar} to .env or export it before running the suite.`,
    );
  }
  return password;
}
