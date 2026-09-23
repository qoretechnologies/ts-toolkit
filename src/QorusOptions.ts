import type { TObjectWithAnyValue, TObjectWithStringKey } from './index';
import ErrorInternal from './managers/error/ErrorInternal';
import logger from './managers/logger';
import { IDataProviderChildren } from './QorusDataProvider';
import QorusValidator from './QorusValidator';

const qorusDataTypesToJsTypesMapper = {
  'object<InputStream>': 'object',
  'object<AbstractDatasource>': 'object',
  'hash<auto>': 'object',
  softint: 'number',
  softbool: 'boolean',
  'softlist<string>': 'array',
};

/**
 * QorusOptions is a helper class which makes working Qorus constructor_options easier
 * - Validate constructor_options property value
 * - set and get constructor_options property values
 * @returns QorusOptions class object
 * @Category QorusOptions
 */
export class QorusOptions {
  /** Name of the provider option  */
  name = '';

  /**
   * Array of constructor_options with validated values
   */
  qorusOptions: TQorusOptions = {};

  constructor(children: IDataProviderChildren) {
    this.name = children.name;
    this.qorusOptions = children.constructor_options;
    this.adjustChildren();
  }

  /**
   * A getter to get constructor options property object
   * @param propertyName Name of the property
   * @returns Property object with name and value
   */
  get(optionName: string): IQorusPropertyOptions | undefined {
    if (this.qorusOptions && this.qorusOptions.hasOwnProperty(optionName)) {
      return this.qorusOptions[optionName];
    } else return undefined;
  }

  private adjustChildren() {
    if (this.qorusOptions) {
      Object.keys(this.qorusOptions).forEach((key) => {
        this.qorusOptions[key].jsType = this.createJsTypes(this.qorusOptions[key].type);
        this.qorusOptions[key].name = key;
      });
    }
  }

  /**
   * A validator method to check if all the required properties for constructor_options contains a value
   * @returns True if values for all the required properties exist, false otherwise
   */
  validateRequired(): boolean {
    let result = true;
    for (const key in this.qorusOptions) {
      if (this.qorusOptions[key].required) {
        if (!this.qorusOptions[key].value) {
          result = false;
          logger.error(`${key} is required for ${this.name} provider`);
        }
      }
    }
    return result;
  }

  /**
   * Get all values required for the provider
   * @returns Array of values for the constructor options if required values exist, undefined otherwise
   */
  getAll(): TObjectWithStringKey | undefined {
    const isValid = this.validateRequired();
    if (!isValid) {
      return undefined;
    }

    const allOptions: TObjectWithAnyValue | undefined = {};
    Object.keys(this.qorusOptions).forEach((key) => {
      if (this.qorusOptions[key].value) {
        allOptions[key] = this.qorusOptions[key].value;
      }
    });

    return allOptions;
  }

  /**
   * A parser function to modify options object
   * @param children Children for which options will be created
   * @returns Object with constructor options
   */
  private createJsTypes(types: string[]): string[] {
    if (!types) return [];
    const jsTypes: string[] = [];
    types.forEach((type) => {
      jsTypes.push(this.convertToJsType(type));
    });

    return jsTypes;
  }

  /**
   * A private function to convert types to js types
   * @param type Type to be converted
   * @returns Converted type
   */
  private convertToJsType(type: string) {
    if (qorusDataTypesToJsTypesMapper.hasOwnProperty(type)) {
      return qorusDataTypesToJsTypesMapper[type] as string;
    } else return type;
  }

  /**
   * A getter to get property type
   * @param propertyName Name of the property
   * @return Types accepted by the property
   */
  getType(propertyName: string): string[] | undefined {
    if (this.qorusOptions.hasOwnProperty(propertyName)) {
      if (!this.qorusOptions[propertyName].type) {
        logger.error(
          new ErrorInternal(`Property ${propertyName} doesn't exist in constructor options of ${this.name}`),
        );
      }
      return this.qorusOptions[propertyName].type;
    }
    logger.error(new ErrorInternal(`Property ${propertyName} doesn't exist in constructor options of ${this.name}`));
    return undefined;
  }

  /**
   * A getter to get js types for a property
   * @param propertyName name of the property
   * @returns js types accepted by the property
   */
  getJsType(propertyName: string): string[] | undefined {
    if (this.qorusOptions.hasOwnProperty(propertyName) && this.qorusOptions[propertyName].jsType) {
      return this.qorusOptions[propertyName].jsType;
    }
    logger.error(new ErrorInternal(`Property ${propertyName} doesn't exist in constructor options of ${this.name}`));
    return undefined;
  }

  /**
   * A setter to set constructor options property value
   * @param propertyName Name of the property
   * @param propertyValue Value for the property
   * @returns Property object
   */
  set(propertyName: string, value: any): IQorusPropertyOptions | undefined {
    const isValid = this.validate(propertyName, value);
    if (!isValid) {
      throw new ErrorInternal(`Value is not valid for the property ${propertyName}`);
    }
    if (this.qorusOptions.hasOwnProperty(propertyName)) {
      this.qorusOptions[propertyName].value = value;
    }

    return this.qorusOptions[propertyName];
  }

  /**
   * A method to validate if the provided value can be used by the property
   * @param propertyName Name of the property
   * @param propertyValue Value for the property
   * @returns True if value can be used, False otherwise
   */
  validate(propertyName: string, value: any): boolean {
    const types = this.get(propertyName)?.type;
    if (types) {
      let result = false;
      types.forEach((type) => {
        if (QorusValidator.validate(type, value)) {
          result = true;
        }
      });
      return result;
    }
    return false;
  }
}

/**
 * Property object for constructor_options
 */
export type TQorusOptions = Record<string, IQorusPropertyOptions>;

export interface IQorusPropertyOptions {
  /**
   * Accepted types for the constructor_options property
   */
  type: string[];

  /**
   * Description of constructor_options property
   */
  desc: string;

  /**
   * Verifies if the constructor_options property is required
   */
  required: boolean;

  /**
   * Verifies if the constructor_options property is sensitive
   */
  sensitive: boolean;

  /**
   * Property value for a constructor_options property
   */
  value?: any;

  /**
   * Converted Qorus types to jsTypes
   */
  jsType?: string[] | undefined;

  /**
   * Name of a constructor_options property
   */
  name?: string;
}
