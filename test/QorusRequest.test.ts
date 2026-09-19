import dotenv from 'dotenv';
import { QorusAuthenticator, QorusRequest } from '../src';
import ErrorInternal from '../src/managers/error/ErrorInternal';
import ErrorQorusRequest from '../src/managers/error/ErrorQorusRequest';
import { describeIntegration, getIntegrationEnv } from './integrationEnv';

dotenv.config();

/**
 * Most of what `QorusRequest` does — joining the base URL to the path,
 * serialising params and bodies, turning a failed response into an
 * `ErrorQorusRequest`, handing the response headers back — is decided before or
 * after the https call and needs no server at all. Those cases mock `fetch`, so
 * they run on any machine and assert the exact request that would have gone out
 * instead of a property of whatever the instance happened to answer.
 *
 * The cases that really are end-to-end are in the integration block at the
 * bottom, which is skipped when no live instance is configured.
 */

/** A reserved TLD (RFC 2606): it can never resolve, so a missed mock cannot reach a real host. */
const unitEndpoint = { url: 'https://qorus.invalid', endpointId: 'qorusRequestUnitTests' };

interface IStubResponseParams {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  /** Raw body text; `json()` parses it, and rejects when it is not JSON, as a real response does. */
  body?: string;
}

const stubResponse = ({
  ok = true,
  status = 200,
  statusText = 'OK',
  headers = {},
  body = '{}',
}: IStubResponseParams = {}): Response =>
  ({
    ok,
    status,
    statusText,
    headers: {
      forEach: (callback: (value: string, key: string) => void): void => {
        Object.entries(headers).forEach(([key, value]) => callback(value, key));
      },
    },
    json: async (): Promise<unknown> => JSON.parse(body),
    text: async (): Promise<string> => body,
  } as unknown as Response);

type TFetchSpy = jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;

/** Returns what was thrown, and fails the test if nothing was. */
const captureError = async (request: () => Promise<unknown>): Promise<unknown> => {
  try {
    await request();
  } catch (error) {
    return error;
  }

  throw new Error('the request should have thrown, but it resolved');
};

describe('QorusRequest unit tests', () => {
  let fetchSpy: TFetchSpy;

  beforeEach(() => {
    /* No endpoint is selected unless a test selects one, so nothing leaks in from another block. */
    QorusAuthenticator.reset();
    fetchSpy = jest.spyOn(globalThis, 'fetch') as TFetchSpy;
    fetchSpy.mockResolvedValue(stubResponse());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    QorusAuthenticator.reset();
  });

  /** The URL the single mocked call was made with. */
  const requestedUrl = (): string => String(fetchSpy.mock.calls[0][0]);

  /** The init of the single mocked call. */
  const requestedInit = (): RequestInit => fetchSpy.mock.calls[0][1] as RequestInit;

  const requestedHeaders = (): Record<string, string> => requestedInit().headers as Record<string, string>;

  it('Should correctly concatenate URL and path - base URL without trailing slash, path with leading slash', async () => {
    await QorusRequest.get({ path: '/api/latest/dataprovider/browse' }, unitEndpoint);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(requestedUrl()).toEqual('https://qorus.invalid/api/latest/dataprovider/browse');
  });

  it('Should correctly concatenate URL and path - base URL with trailing slash, path with leading slash', async () => {
    await QorusRequest.get(
      { path: '/api/latest/dataprovider/browse' },
      { ...unitEndpoint, url: 'https://qorus.invalid/' },
    );

    expect(requestedUrl()).toEqual('https://qorus.invalid/api/latest/dataprovider/browse');
  });

  it('Should correctly concatenate URL and path - path without a leading slash', async () => {
    await QorusRequest.get({ path: 'api/latest/public/info' }, unitEndpoint);

    expect(requestedUrl()).toEqual('https://qorus.invalid/api/latest/public/info');
  });

  it('Should append serialized query parameters to the URL', async () => {
    await QorusRequest.get(
      { path: '/api/latest/dataprovider/browse', params: { context: 'api', ids: [1, 2] } },
      unitEndpoint,
    );

    expect(requestedUrl()).toEqual(
      'https://qorus.invalid/api/latest/dataprovider/browse?context=api&ids%5B0%5D=1&ids%5B1%5D=2',
    );
  });

  it('Should not append a question mark when there are no query parameters', async () => {
    await QorusRequest.get({ path: '/api/latest/dataprovider/browse', params: {} }, unitEndpoint);

    expect(requestedUrl()).toEqual('https://qorus.invalid/api/latest/dataprovider/browse');
  });

  it('Should return response headers alongside data', async () => {
    fetchSpy.mockResolvedValue(
      stubResponse({
        headers: { 'content-type': 'application/json', 'qorus-rest-api-version': 'latest' },
        body: '{"type":"nav"}',
      }),
    );

    const result = await QorusRequest.get({ path: '/api/latest/dataprovider/browse' }, unitEndpoint);

    expect(result.data).toEqual({ type: 'nav' });
    expect(result.headers).toEqual({ 'content-type': 'application/json', 'qorus-rest-api-version': 'latest' });
  });

  it('Should send a JSON body and content type by default', async () => {
    await QorusRequest.post({ path: '/api/latest/public/login', data: { user: 'bob', pass: 'p a s s' } }, unitEndpoint);

    expect(requestedHeaders()['Content-Type']).toEqual('application/json');
    expect(requestedInit().body).toEqual('{"user":"bob","pass":"p a s s"}');
    expect(requestedInit().method).toEqual('POST');
  });

  it('Should handle form-urlencoded body type', async () => {
    await QorusRequest.post(
      { path: '/api/latest/public/login', data: { user: 'bob', pass: 'p a s s' }, bodyType: 'form-urlencoded' },
      unitEndpoint,
    );

    expect(requestedHeaders()['Content-Type']).toEqual('application/x-www-form-urlencoded');
    expect(requestedInit().body).toEqual('user=bob&pass=p%20a%20s%20s');
  });

  it('Should let a custom header override the default of the same name', async () => {
    await QorusRequest.get({ path: '/api/latest/public/info', headers: { Accept: 'text/plain' } }, unitEndpoint);

    expect(requestedHeaders().Accept).toEqual('text/plain');
    expect(requestedHeaders()['Content-Type']).toEqual('application/json');
  });

  it('Should send the endpoint auth token when the endpoint has one', async () => {
    await QorusRequest.get({ path: '/api/latest/public/info' }, { ...unitEndpoint, authToken: 'a-token' });

    expect(requestedHeaders()['Qorus-Token']).toEqual('a-token');
  });

  it('Should return an empty data object for a 204 response', async () => {
    fetchSpy.mockResolvedValue(stubResponse({ status: 204, statusText: 'No Content', body: '' }));

    const result = await QorusRequest.deleteReq({ path: '/api/latest/jobs/1' }, unitEndpoint);

    expect(result.data).toEqual({});
  });

  it('Should fall back to the response text when the body is not JSON', async () => {
    fetchSpy.mockResolvedValue(stubResponse({ body: 'not json at all' }));

    const result = await QorusRequest.get({ path: '/api/latest/public/info' }, unitEndpoint);

    expect(result.data).toEqual('not json at all');
  });

  it('Should handle empty error response with fallback error object', async () => {
    fetchSpy.mockResolvedValue(stubResponse({ ok: false, status: 500, statusText: 'Internal Server Error', body: '' }));

    const error = await captureError(() => QorusRequest.get({ path: '/api/latest/public/info' }, unitEndpoint));

    expect(error).toBeInstanceOf(ErrorQorusRequest);
    expect((error as ErrorQorusRequest).message).toEqual(
      'QorusRequest error: Server returned empty response (500 Internal Server Error)',
    );
    expect((error as ErrorQorusRequest).name).toEqual('Internal Server Error');
    expect((error as ErrorQorusRequest).statusCode).toEqual(500);
  });

  it('Should get a forbidden error', async () => {
    fetchSpy.mockResolvedValue(
      stubResponse({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        body: '{"status":403,"err":"FORBIDDEN","desc":"user has no permission to call this API"}',
      }),
    );

    const error = await captureError(() => QorusRequest.get({ path: '/api/latest/system' }, unitEndpoint));

    expect(error).toBeInstanceOf(ErrorQorusRequest);
    expect((error as ErrorQorusRequest).message).toEqual('user has no permission to call this API');
    expect((error as ErrorQorusRequest).name).toEqual('FORBIDDEN');
    expect((error as ErrorQorusRequest).statusCode).toEqual(403);
  });

  it('Should report a transport failure as a network error', async () => {
    fetchSpy.mockRejectedValue(new Error('getaddrinfo ENOTFOUND qorus.invalid'));

    const error = await captureError(() => QorusRequest.get({ path: '/api/latest/public/info' }, unitEndpoint));

    expect(error).toBeInstanceOf(ErrorQorusRequest);
    expect((error as ErrorQorusRequest).name).toEqual('Network Error');
    expect((error as ErrorQorusRequest).message).toEqual('getaddrinfo ENOTFOUND qorus.invalid');
  });

  it('Should throw an internal error when no endpoint has been initialized', async () => {
    const error = await captureError(() => QorusRequest.get({ path: '/api/latest/public/info' }));

    expect(error).toBeInstanceOf(ErrorInternal);
    expect((error as ErrorInternal).message).toEqual(
      'Initialize an endpoint using QorusAuthenticator to use QorusRequest',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describeIntegration('QorusRequest Utility Tests', () => {
  beforeAll(async () => {
    const { endpoint, user, pass } = getIntegrationEnv();

    QorusAuthenticator.addEndpoint({
      url: endpoint,
      endpointId: 'rippyRequest',
    });
    await QorusAuthenticator.login({ user, pass });
  });

  it('Should make a post request and return the result', async () => {
    const { user, pass } = getIntegrationEnv();
    const result = await QorusRequest.post({
      path: '/api/latest/public/login',
      data: { user, pass },
    });

    expect(typeof result.data.token).toEqual('string');
  });

  it('Should make a get request and return the result', async () => {
    const result = await QorusRequest.get({
      path: '/api/latest/dataprovider/browse',
    });

    expect(result.data.type).toEqual('nav');
  });

  it('Should make a put request and return the result', async () => {
    const result = await QorusRequest.put({
      path: '/api/latest/dataprovider/browse',
      params: { context: 'api' },
    });

    expect(result.data.type).toEqual('nav');
  });

  it('Should return response headers alongside data', async () => {
    const result = await QorusRequest.get({
      path: '/api/latest/dataprovider/browse',
    });

    expect(result.headers).toBeDefined();
    expect(typeof result.headers).toEqual('object');
  });

  it('Should correctly concatenate URL and path - base URL without trailing slash, path with leading slash', async () => {
    const result = await QorusRequest.get({
      path: '/api/latest/dataprovider/browse',
    });

    expect(result.data.type).toEqual('nav');
  });

  it('Should handle form-urlencoded body type', async () => {
    const { user, pass } = getIntegrationEnv();
    const result = await QorusRequest.post({
      path: '/api/latest/public/login',
      data: { user, pass },
      bodyType: 'form-urlencoded',
    });

    expect(typeof result.data.token).toEqual('string');
  });
});
