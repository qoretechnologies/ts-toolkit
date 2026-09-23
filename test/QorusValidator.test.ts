import dotenv from 'dotenv';
import QorusValidator from '../src/QorusValidator';
import { fixOperatorValue, getAddress, splitByteSize } from '../src/utils/validation';
import { describeIntegration } from './integrationEnv';

dotenv.config();

describeIntegration.skip('QorusDataProvider Utility Class Tests', () => {
  it('should validate the value for all string types', () => {
    expect(QorusValidator.validate('binary', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('string', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('mapper', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('workflow', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('service', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('job', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('connection', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('softstring', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('select-string', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('file-string', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('file-as-string', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('binary', 'Qorus Test String')).toEqual(true);
    expect(QorusValidator.validate('method-name', 'Qorus Test String')).toEqual(true);
  });

  it('should return false if the value is not string', () => {
    expect(QorusValidator.validate('binary', 2)).toEqual(false);
    expect(QorusValidator.validate('string', 2)).toEqual(false);
    expect(QorusValidator.validate('mapper', 2)).toEqual(false);
    expect(QorusValidator.validate('workflow', 2)).toEqual(false);
    expect(QorusValidator.validate('service', 2)).toEqual(false);
    expect(QorusValidator.validate('job', 2)).toEqual(false);
    expect(QorusValidator.validate('connection', 2)).toEqual(false);
    expect(QorusValidator.validate('softstring', 2)).toEqual(false);
    expect(QorusValidator.validate('select-string', 2)).toEqual(false);
    expect(QorusValidator.validate('file-string', 2)).toEqual(false);
    expect(QorusValidator.validate('file-as-string', 2)).toEqual(false);
    expect(QorusValidator.validate('method-name', 2)).toEqual(false);
    expect(QorusValidator.validate('binary', 2)).toEqual(false);
  });

  it('should return true if class-connector value has required properties', () => {
    expect(QorusValidator.validate('class-connectors', [{ name: 'name', method: 'method' }])).toEqual(true);
  });

  it('should return false if class-connector value does not have required properties', () => {
    // name and method are required properties for class-connector value
    expect(QorusValidator.validate('class-connectors', [{ name: 'name' }])).toEqual(false);
    expect(QorusValidator.validate('class-connectors', [])).toEqual(false);
    expect(QorusValidator.validate('class-connectors', '')).toEqual(false);
  });

  it('should return true if the value is a number', () => {
    expect(QorusValidator.validate('int', 2)).toEqual(true);
    expect(QorusValidator.validate('softint', 2)).toEqual(true);
    expect(QorusValidator.validate('number', 2)).toEqual(true);
    expect(QorusValidator.validate('float', 2)).toEqual(true);
  });

  it('should return false if the value is not a number', () => {
    expect(QorusValidator.validate('int', '2')).toEqual(false);
    expect(QorusValidator.validate('softint', '2')).toEqual(false);
    expect(QorusValidator.validate('number', '2')).toEqual(false);
    expect(QorusValidator.validate('float', '2')).toEqual(false);
  });

  it('should return false if the value is a array with at least one item', () => {
    expect(QorusValidator.validate('select-array', [])).toEqual(false);
    expect(QorusValidator.validate('file-tree', [])).toEqual(false);
    expect(QorusValidator.validate('array', [])).toEqual(false);
  });

  it('should return true if the value is a array with at least one item', () => {
    expect(QorusValidator.validate('select-array', ['"Qorus test string"'])).toEqual(true);
    expect(QorusValidator.validate('file-tree', ['"Qorus test string"'])).toEqual(true);
    expect(QorusValidator.validate('array', ['"Qorus test string"'])).toEqual(true);
  });

  it('should return true if the value is a valid date', () => {
    expect(QorusValidator.validate('date', new Date())).toEqual(true);
  });

  it('should return false if the value is not a valid date', () => {
    expect(QorusValidator.validate('date', '"Qorus test string"')).toEqual(false);
  });

  it('should return false if the value is not an object', () => {
    expect(QorusValidator.validate('hash', '"Qorus test string"')).toEqual(false);
    expect(QorusValidator.validate('hash<auto>', '"Qorus test string"')).toEqual(false);
  });

  it('should return true if the value is a object', () => {
    expect(QorusValidator.validate('hash', {})).toEqual(true);
    expect(QorusValidator.validate('hash<auto>', {})).toEqual(true);
  });

  it('should return true if the value a object', () => {
    expect(QorusValidator.validate('list', {})).toEqual(true);
    expect(QorusValidator.validate('list<auto>', {})).toEqual(true);
    expect(QorusValidator.validate('softlist<auto>', {})).toEqual(true);
  });

  it('should return false if the value is not an object', () => {
    expect(QorusValidator.validate('list', 'Qorus test string')).toEqual(false);
    expect(QorusValidator.validate('list<auto>', 'Qorus test string')).toEqual(false);
    expect(QorusValidator.validate('softlist<auto>', 'Qorus test string')).toEqual(false);
  });

  it('should return false if the value is not a valid mapper-code string', () => {
    expect(QorusValidator.validate('mapper-code', 'Qorus test string')).toEqual(false);
  });

  it('should return true if the value is a valid mapper-code string', () => {
    expect(QorusValidator.validate('mapper-code', 'code::method')).toEqual(true);
  });

  it('should return false if the value is not a valid context-selector string', () => {
    expect(QorusValidator.validate('context-selector', 'Qorus test string')).toEqual(false);
  });

  it('should return true if the value is a valid context-selector string', () => {
    expect(QorusValidator.validate('context-selector', 'code:method')).toEqual(true);
  });

  it('should return true if the value is a valid url string', () => {
    expect(QorusValidator.validate('url', 'https://www.something.com')).toEqual(true);
  });

  it('should return false if the value is not a valid url string', () => {
    expect(QorusValidator.validate('url', 'Qorus test string')).toEqual(false);
  });

  it('should return false if the type is nothing', () => {
    expect(QorusValidator.validate('nothing', 'Qorus test string')).toEqual(false);
  });

  it('should return false if the value does not contain required fields for byte-size', () => {
    expect(QorusValidator.validate('byte-size', 'Qorus test string')).toEqual(false);
    expect(QorusValidator.validate('byte-size', 'MB')).toEqual(false);
    expect(QorusValidator.validate('byte-size', '23')).toEqual(false);
    expect(QorusValidator.validate('byte-size', 23)).toEqual(false);
  });

  it('should return true if the value contains valid string for byte-size', () => {
    expect(QorusValidator.validate('byte-size', '23MB')).toEqual(true);
  });

  it('should return true if the value for endpoint is a string for api-endpoints', () => {
    expect(QorusValidator.validate('api-endpoints', [{ value: 'endpoint' }])).toEqual(true);
  });

  it('should return false if the value for endpoint is not a string for api-endpoints', () => {
    expect(QorusValidator.validate('api-endpoints', [{ value: 3 }])).toEqual(false);
    expect(QorusValidator.validate('api-endpoints', [])).toEqual(false);
    expect(QorusValidator.validate('api-endpoints', 'Qorus test string')).toEqual(false);
  });

  it('should return true if all the required fields are valid for api-manager', () => {
    expect(
      QorusValidator.validate('api-manager', {
        factory: 'factory',
        'provider-options': 'some',
        endpoints: [{ value: 'endpoint' }],
      }),
    ).toEqual(true);
  });

  it('should return false if the required fields are not provided for api-manager', () => {
    expect(
      QorusValidator.validate('api-manager', {
        'provider-options': 'some',
        endpoints: [{ value: 'endpoint' }],
      }),
    ).toEqual(false);

    expect(QorusValidator.validate('api-manager', {})).toEqual(false);
  });

  it('should return false if the value is empty or not a string', () => {
    expect(QorusValidator.validate('options', '')).toEqual(false);
    expect(QorusValidator.validate('pipeline-options', '')).toEqual(false);
    expect(QorusValidator.validate('mapper-options', '')).toEqual(false);
    expect(QorusValidator.validate('system-options', '')).toEqual(false);
  });

  it('should return true if the value is not a empty string', () => {
    expect(QorusValidator.validate('options', 'Qorus test string')).toEqual(true);
    expect(QorusValidator.validate('pipeline-options', 'Qorus test string')).toEqual(true);
    expect(QorusValidator.validate('mapper-options', 'Qorus test string')).toEqual(true);
    expect(QorusValidator.validate('system-options', 'Qorus test string')).toEqual(true);
  });

  it('should return true if the value is not a empty string', () => {
    expect(QorusValidator.validate('options', 'Qorus test string')).toEqual(true);
    expect(QorusValidator.validate('pipeline-options', 'Qorus test string')).toEqual(true);
    expect(QorusValidator.validate('mapper-options', 'Qorus test string')).toEqual(true);
    expect(QorusValidator.validate('system-options', 'Qorus test string')).toEqual(true);
  });

  it('should return true if the value contains valid required fields for fsm-list', () => {
    expect(QorusValidator.validate('fsm-list', [{ name: 'Qorus test string' }])).toEqual(true);
  });

  it('should return false if the value does not contains valid required fields for fsm-list', () => {
    expect(QorusValidator.validate('fsm-list', [{ name: 2 }])).toEqual(false);
    expect(QorusValidator.validate('fsm-list', [])).toEqual(false);
    expect(QorusValidator.validate('fsm-list', [{}])).toEqual(false);
  });

  it('should return true if the value is valid yaml', () => {
    expect(QorusValidator.validate('any', [{ something: { something: { something: 'value' } } }])).toEqual(true);
    expect(QorusValidator.validate('auto', [{ something: { something: { something: 'value' } } }])).toEqual(true);
  });

  it('should return false if the value is not valid yaml', () => {
    expect(QorusValidator.validate('any', [])).toEqual(false);
    expect(QorusValidator.validate('auto', '')).toEqual(false);
  });

  it('should return true if the value is not valid yaml', () => {
    expect(QorusValidator.validate('any', [])).toEqual(false);
    expect(QorusValidator.validate('auto', '')).toEqual(false);
  });

  it('should return true if the provided value is an object', () => {
    expect(QorusValidator.validate('data-provider', { type: 'factory', name: 'factory' })).toEqual(true);
    expect(
      QorusValidator.validate('type-selector', { type: 'type-selector', name: 'factory', path: 'factory' }),
    ).toEqual(true);
  });

  it('should return false if the provided value not a valid object', () => {
    expect(QorusValidator.validate('data-provider', {})).toEqual(false);
    expect(QorusValidator.validate('type-selector', [])).toEqual(false);
  });

  it('should return true if all the required values are valid for processor', () => {
    expect(
      QorusValidator.validate('processor', {
        'processor-input-type': { type: 'type-selector', name: 'factory', path: 'factory' },
        'processor-output-type': { type: 'type-selector', name: 'factory', path: 'factory' },
      }),
    ).toEqual(true);
  });

  it('should return false if the required values for the processor are not valid', () => {
    expect(QorusValidator.validate('processor', {})).toEqual(false);
    expect(
      QorusValidator.validate('processor', {
        'processor-input-type': { type: 'type-selector', name: 'factory', path: 'factory' },
      }),
    ).toEqual(false);
    expect(
      QorusValidator.validate('processor', {
        'processor-output-type': { type: 'type-selector', name: 'factory', path: 'factory' },
      }),
    ).toEqual(false);
  });

  it('should return false if the provided data is not a valid system-options-with-operators', () => {
    expect(
      QorusValidator.validate('system-options-with-operators', [
        {
          type: 'any',
          value: [{ something: { something: { something: 'value' } } }],
          op: ['some'],
        },
      ]),
    ).toEqual(false);
  });

  it('should return true if the value is a valid class-array', () => {
    expect(QorusValidator.validate('class-array', [{ name: 'Qorus test string' }])).toEqual(true);
  });

  it('should return false if the value is not a valid class-array', () => {
    expect(QorusValidator.validate('class-array', [])).toEqual(false);
  });

  it('should return true if the value is a valid Qorus version', () => {
    expect(QorusValidator.validate('version', 1)).toEqual(true);
    expect(QorusValidator.validate('version', 2)).toEqual(true);
    expect(QorusValidator.validate('version', 3)).toEqual(true);
    expect(QorusValidator.validate('version', 4)).toEqual(true);
    expect(QorusValidator.validate('version', 5)).toEqual(true);
    expect(QorusValidator.validate('version', 6)).toEqual(true);
    expect(QorusValidator.validate('version', 'latest')).toEqual(true);
  });

  it('should return false if the value is not a valid Qorus version', () => {
    expect(QorusValidator.validate('version', 0)).toEqual(false);
    expect(QorusValidator.validate('version', false)).toEqual(false);
    expect(QorusValidator.validate('version', '')).toEqual(false);
    expect(QorusValidator.validate('version', null)).toEqual(false);
    expect(QorusValidator.validate('version', '1')).toEqual(false);
  });

  it('should return type of the value', () => {
    expect(QorusValidator.getTypeFromValue(true)).toEqual('bool');
    expect(QorusValidator.getTypeFromValue(1)).toEqual('int');
    expect(QorusValidator.getTypeFromValue(0.1)).toEqual('float');
    expect(QorusValidator.getTypeFromValue({})).toEqual('hash');
    expect(QorusValidator.getTypeFromValue([])).toEqual('list');
    expect(QorusValidator.getTypeFromValue(new Date())).toEqual('date');
    expect(QorusValidator.getTypeFromValue('')).toEqual('string');
  });
});

describe('Validation util tests', () => {
  it('should return url string', () => {
    expect(getAddress('https://sandbox.qoretechnologies.com/')).toEqual('sandbox.qoretechnologies.com/');
  });

  it('should fix operator value', () => {
    expect(fixOperatorValue(['something'])).toEqual(['something']);
    expect(fixOperatorValue('something')).toEqual(['something']);
  });

  it('should return byte and size from a byteSize string', () => {
    expect(splitByteSize('32MB')).toEqual([32, 'MB']);
  });
});
