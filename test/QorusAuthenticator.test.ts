import dotenv from 'dotenv';
import { QorusAuthenticator } from '../src';
import ErrorInternal from '../src/managers/error/ErrorInternal';
import ErrorQorusRequest from '../src/managers/error/ErrorQorusRequest';
import { describeIntegration, getIntegrationEnv, itIntegration } from './integrationEnv';

dotenv.config();

//const loggerMock = jest.spyOn(logger, 'log');

describeIntegration.skip('QorusLogin Utility Class Tests', () => {
  jest.setTimeout(30000);
  it('Should initialize the endpoint and assign it to the selected endpoint', () => {
    QorusAuthenticator.addEndpoint({ url: process.env.ENDPOINT!, endpointId: 'rippy' });

    const endpoint = QorusAuthenticator.getSelectedEndpoint();
    expect(endpoint).toMatchSnapshot();
  });

  it('Should return user token after authentication (login)', async () => {
    let token = await QorusAuthenticator.login({ user: process.env.TESTUSER!, pass: process.env.TESTPASS! });

    expect(typeof token).toEqual('string');
  });

  it('Should return the enpoint from the endpoints array', () => {
    const endpoint = QorusAuthenticator.getEndpointById('rippy');

    expect(endpoint?.endpointId).toEqual('rippy');
  });

  it('Should return all the available endpoints ', () => {
    const endpoints = QorusAuthenticator.getAllEndpoints();

    expect(endpoints).not.toBeNull();
  });

  it('Should return version of the selected endpoint', () => {
    const version = QorusAuthenticator.getEndpointVersion();

    expect(version).toEqual('latest');
  });

  it('Should return api paths for the selected endpoint', () => {
    expect(QorusAuthenticator.getApiPaths()).toMatchSnapshot();
  });

  it('Should return current user token if the user is authenticated', () => {
    const token = QorusAuthenticator.getAuthToken();

    expect(typeof token).toEqual('string');
  });

  it('Should return the current endpoint', () => {
    const config = QorusAuthenticator.getSelectedEndpoint();

    expect(config!.endpointId).toMatchSnapshot();
  });

  it('Should return all the endpoints', () => {
    const endpoints = QorusAuthenticator.getAllEndpoints();

    expect(endpoints.length).toMatchSnapshot();
  });
});

describe('QorusLogin Utility Error Tests', () => {
  /*
   * Only the three `itIntegration` cases reach the instance: they call
   * `login()`, which starts with `checkNoAuth()` — an https request. The
   * others assert argument checks that `addEndpoint()` makes before anything
   * is sent, so they run everywhere.
   */
  itIntegration('Should throw an Authentication Error when user tries to authenticate with wrong credentials', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({ url: getIntegrationEnv().endpoint, endpointId: 'rippy2' });
      await QorusAuthenticator.login({ user: 'bob', pass: 'pass' });
    } catch (error) {
      err = error;
    }

    expect(err instanceof ErrorQorusRequest).toEqual(true);
  });

  itIntegration('Should throw an error if the user does not provide username and password for authentication.', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({ url: getIntegrationEnv().endpoint, endpointId: 'rippy2' });
      await QorusAuthenticator.login();
    } catch (error) {
      err = error;
    }
    expect(err instanceof ErrorInternal).toEqual(true);
  });

  it('Should throw an Internal Error if the id and url are not valid to initialize an endpoint', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({ url: '', endpointId: '' });
    } catch (error) {
      err = error;
    }
    expect(err instanceof ErrorInternal).toEqual(true);
  });

  itIntegration('Should throw an Internal error if the no-auth status cannot be checked', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({
        url: 'https://sandbox.qoretechnologies.',
        endpointId: 'rippy2',
      });
      await QorusAuthenticator.login({
        user: 'some',
        pass: 'some',
      });
    } catch (error) {
      err = error;
    }
    expect(err instanceof ErrorInternal).toEqual(true);
  });

  it('Should throw an Internal error if url is not valid for initializing endpoint', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({
        url: '',
        endpointId: 'rippy2',
      });
    } catch (error) {
      err = error;
    }
    expect(err instanceof ErrorInternal).toEqual(true);
  });

  it('Should throw an Internal error if id is not valid for initializing endpoint', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({
        url: 'https://sandbox.qoretechnologies.com',
        endpointId: '',
      });
    } catch (error) {
      err = error;
    }
    expect(err instanceof ErrorInternal).toEqual(true);
  });

  it('Should throw an Internal error if id and url is not valid for initializing endpoint', async () => {
    let err;
    try {
      QorusAuthenticator.addEndpoint({
        url: '',
        endpointId: '',
      });
    } catch (error) {
      err = error;
    }
    expect(err instanceof ErrorInternal).toEqual(true);
  });
});
