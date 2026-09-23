import dotenv from 'dotenv';

/*
 * Integration suites in this repository talk to a live Qorus instance that is
 * identified by three environment variables. CI supplies them as secrets; a
 * developer machine normally has none of them.
 *
 * Missing credentials mean "there is nothing to talk to", not "the code is
 * broken", so a suite that needs them must report as SKIPPED rather than fail.
 * Deciding that at module scope with a `throw` fails the whole file before Jest
 * ever looks at the blocks inside it, which is what made `yarn precheck`
 * unusable off CI.
 *
 * `dotenv.config()` runs here, at import time, so the decision sees a `.env`
 * file even if the importing suite has not called `dotenv.config()` yet:
 * imports are evaluated before the importing module's own body.
 */
dotenv.config();

/** The environment variables that identify the live Qorus instance. */
export const INTEGRATION_ENV_VARS = ['ENDPOINT', 'TESTUSER', 'TESTPASS'] as const;

export type TIntegrationEnvVar = (typeof INTEGRATION_ENV_VARS)[number];

export interface IIntegrationEnv {
  /** Base URL of the live Qorus instance */
  endpoint: string;

  /** User to authenticate as */
  user: string;

  /** Password for {@link IIntegrationEnv.user} */
  pass: string;
}

/** Returns the variables of {@link INTEGRATION_ENV_VARS} that are unset or empty. */
export const getMissingIntegrationEnvVars = (): TIntegrationEnvVar[] =>
  INTEGRATION_ENV_VARS.filter((name) => !process.env[name]);

/** Whether a live Qorus instance is configured for this run. */
export const hasIntegrationEnv = (): boolean => getMissingIntegrationEnvVars().length === 0;

/** Why the integration suites are being skipped, naming the variables that are missing. */
export const getIntegrationSkipReason = (): string =>
  `no live Qorus instance configured; set ${getMissingIntegrationEnvVars().join(', ')} (see .env.example)`;

/**
 * The live instance's credentials.
 * @throws Error if called when {@link hasIntegrationEnv} is false, which can only
 * happen from inside a block that should have been skipped.
 */
export const getIntegrationEnv = (): IIntegrationEnv => {
  if (!hasIntegrationEnv()) {
    throw new Error(`Integration credentials are not available: ${getIntegrationSkipReason()}`);
  }

  return {
    endpoint: process.env.ENDPOINT as string,
    user: process.env.TESTUSER as string,
    pass: process.env.TESTPASS as string,
  };
};

export type TDescribeBody = () => void;

export type TTestBody = jest.ProvidesCallback;

export interface IDescribeIntegration {
  /** Runs the block when a live instance is configured, skips it with a reason otherwise. */
  (name: string, body: TDescribeBody): void;

  /** Always skips the block, whether or not a live instance is configured. */
  skip: (name: string, body: TDescribeBody) => void;
}

/** One warning per test file, not one per block. */
let warned = false;

const warnOnce = (): void => {
  if (warned) {
    return;
  }

  warned = true;
  console.warn(`Skipping integration tests: ${getIntegrationSkipReason()}`);
};

const describeWhenConfigured = (name: string, body: TDescribeBody): void => {
  if (hasIntegrationEnv()) {
    describe(name, body);
    return;
  }

  warnOnce();
  /* The reason is put in the block name so it also shows up in `--verbose` output and in tests.json. */
  describe.skip(`${name} [skipped: ${getIntegrationSkipReason()}]`, body);
};

/**
 * `describe` for a block that needs a live Qorus instance.
 *
 * Use `describeIntegration.skip` for a block that is disabled for its own
 * reasons: it keeps the block's name — and so its snapshot keys — unchanged
 * while still saying that the block is an integration block.
 */
export const describeIntegration: IDescribeIntegration = Object.assign(describeWhenConfigured, {
  skip: (name: string, body: TDescribeBody): void => {
    describe.skip(name, body);
  },
});

/**
 * `it` for a single test that needs a live Qorus instance, for use when the rest
 * of its block does not. The test's name is left alone so it is reported under
 * the name it has on CI.
 */
export const itIntegration = (name: string, body: TTestBody, timeout?: number): void => {
  if (hasIntegrationEnv()) {
    it(name, body, timeout);
    return;
  }

  warnOnce();
  it.skip(name, body, timeout);
};
