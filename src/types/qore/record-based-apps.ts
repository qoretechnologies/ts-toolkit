import { TQoreAppActionFunctionContext, TQoreResponseType } from './actions';
import { IQoreApp } from './apps';
import { IQoreConnectionOption, TQoreAppActionOption, TQoreMappedOptions, TQoreOptions } from './options';
import { TQoreTypeObject } from './types';

export type TQoreSearchRecordsExpressions = Record<TExpressionKey, TQoreSearchRecordsExpressionDefinition>;

export enum EQoreExpressionGroups {
  AGGREGATE = 'Aggregate',
  ALIAS = 'Alias',
  COMPARISON = 'Comparison',
  DATA_CONVERSION = 'Data Conversion',
  DATA_MANIPULATION = 'Data Manipulation',
  DATE_TIME = 'Date/Time',
  LOGICAL = 'Logical',
  SEQUENCE = 'Sequence',
  WINDOW = 'Window',
}

export type TQoreSearchRecordsExpressionDefinition = {
  /** The type of expression: operator or function */
  type: 'operator' | 'function';
  /** The subtype of the expression */
  subtype: 'generic' | 'logic-operator';
  /** The name of the expression */
  name: string;
  /** User-friendly display name */
  display_name: string;
  /** Short plain-text description */
  short_desc: string;
  /** Longer description supporting markdown formatting */
  desc: string;
  /** The symbol or text to use when rendering the expression */
  symbol: string;
  /** Expression role codes determining where it can be used: 'search' for search filters, 'field' for field lists or update values */
  roles: Array<'search' | 'field'>;
  /** If true, the last argument can be repeated indefinitely */
  varargs?: boolean;
  /** The return type of the expression */
  return_type: TQoreResponseType;
  /** The arguments the expression takes */
  args: TExpressionArg[];

  groups?: EQoreExpressionGroups[];
};

export type TExpressionKey =
  | '&&'
  | '||'
  | 'regex'
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'in'
  | 'not'
  | 'like'
  | 'between'
  | 'string'
  | string;

type OmitFromUnion<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

/**
 * Expression argument configuration
 *
 * Defines an argument that can be used in expressions with type validation,
 * allowed values, and display configuration.
 */
export type TExpressionArg = OmitFromUnion<
  TQoreAppActionOption,
  | 'required'
  | 'preselected'
  | 'get_dependent_options'
  | 'rest_get_allowed_values'
  | 'depends_on'
  | 'validation_regex'
  | 'validation_regex_desc'
  | 'attr'
  | 'required_groups'
  | 'on_change'
  | 'get_dynamic_type'
  | 'get_allowed_values'
  | 'get_default_value'
  | 'get_element_allowed_values'
  | 'rest_get_element_allowed_values'
> & {
  /**
   * Determines how the argument value is provided:
   * - `'any'`: Can be an expression, immediate value, or field reference
   * - `'value'`: Must be an immediate value
   * - `'field reference'`: Must be a field reference
   */
  type_code: 'any' | 'value' | 'field reference';

  /**
   * If the argument is sensitive (password, API key, etc.)
   */
  sensitive?: boolean;

  /**
   * Can be true if the argument has a list type and allowed_values are the
   * allowed values for the list elements
   */
  multiselect?: boolean;

  /**
   * Label to display after the argument when rendering expressions
   */
  label_after?: string;

  /**
   * Label to display before the argument when rendering expressions
   */
  label_before?: string;

  render_template?: string;
};

/**
 * Record-based application interface for Qore
 *
 * Provides support for record-based operations including table management,
 * transactions, record types, expressions, and search functionality.
 *
 * @template RestModifierOptions - Connection options configuration
 */
export interface TQoreRecordBasedApp<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
> extends IQoreApp<RestModifierOptions> {
  /**
   * Required for record-based action support. Returns a list of available table names.
   *
   * @param context - Context object containing:
   *   - `conn_name`: The connection name, if any is defined
   *   - `conn_opts`: Connection options + processed options from the auth response + the auth response itself
   * @returns A list of table names
   *
   * @example
   * ```typescript
   * get_table_list: async function(ctx) {
   *   return ["users", "orders", "products"];
   * }
   * ```
   */
  get_table_list: TQoreGetTableListFunction<RestModifierOptions>;

  /**
   * Allows an explicit transaction to be started.
   *
   * @param context - Context object containing:
   *   - `conn_name`: The connection name, if any is defined
   *   - `conn_opts`: Connection options + processed options from the auth response + the auth response itself
   *
   * @example
   * ```typescript
   * begin_transaction: async function(ctx) {
   *   // Start transaction logic
   * }
   * ```
   */
  begin_transaction?: (context: Omit<TQoreAppActionFunctionContext<RestModifierOptions>, 'opts'>) => Promise<void>;

  /**
   * Allows a transaction to be committed.
   *
   * @param context - Context object containing:
   *   - `conn_name`: The connection name, if any is defined
   *   - `conn_opts`: Connection options + processed options from the auth response + the auth response itself
   *
   * @example
   * ```typescript
   * commit: async function(ctx) {
   *   // Commit transaction logic
   * }
   * ```
   */
  commit?: (context: Omit<TQoreAppActionFunctionContext<RestModifierOptions>, 'opts'>) => Promise<void>;

  /**
   * Allows a transaction to be rolled back.
   *
   * @param context - Context object containing:
   *   - `conn_name`: The connection name, if any is defined
   *   - `conn_opts`: Connection options + processed options from the auth response + the auth response itself
   *
   * @example
   * ```typescript
   * rollback: async function(ctx) {
   *   // Rollback transaction logic
   * }
   * ```
   */
  rollback?: (context: Omit<TQoreAppActionFunctionContext<RestModifierOptions>, 'opts'>) => Promise<void>;

  /**
   * Required for record-based action support. Returns the record type definition for a given table.
   *
   * @param context - Context object containing:
   *   - `conn_name`: The connection name, if any is defined
   *   - `conn_opts`: Connection options + processed options from the auth response + the auth response itself
   * @param tableName - The name of the table to get the record type for
   * @returns The record type for the given table; must be a type hash defining a "hash" type
   *
   * @example
   * ```typescript
   * get_record_type: async function(ctx, table_name) {
   *   return {
   *     "type": "hash",
   *     "fields": {
   *       "id": {
   *         "type": "int",
   *         "display_name": "ID",
   *         "short_desc": "The ID",
   *         "required": true,
   *       },
   *       "name": {
   *         "type": "string",
   *         "display_name": "Name",
   *         "required": true,
   *       },
   *     },
   *   };
   * }
   * ```
   */
  get_record_type: TQoreGetRecordTypeFunction<RestModifierOptions>;

  expressions: TQoreSearchRecordsExpressions;

  /**
   * Executes a search query and returns matching records.
   *
   * Returns a callable function that can be invoked to retrieve record sets in blocks.
   * The returned function yields records as an object with field names as keys and
   * arrays of field values as values.
   *
   * @param context - Context object containing:
   *   - `conn_name`: The connection name, if any is defined
   *   - `conn_opts`: Connection options; for REST connections, see the 'rest' object definition
   *   - `opts`: A data object with option values set for the current action
   * @param where_cond - Optional search expression tree defining the filter conditions
   * @param search_opts - Search options; the table name will be provided as `search_opts.table`
   * @returns A callable function `get_records(ctx, block_size)` that returns a record set.
   *   The record set is an object with keys corresponding to field names and values that
   *   are arrays of field values. Each record must match the record type for the table.
   *
   * @example
   * ```typescript
   * search_records: async function(ctx, where_cond, search_opts) {
   *   if (search_opts.table !== 'test') {
   *     throw new Error('Unknown table ' + search_opts.table);
   *   }
   *   let done = false;
   *   function get_records(ctx, block_size) {
   *     if (!done) {
   *       done = true;
   *       return {
   *         "id": [1, 2],
   *         "name": ["a", "b"],
   *       };
   *     }
   *   }
   *   return get_records;
   * }
   * ```
   */
  search_records?: TQoreSearchRecordsFunction<RestModifierOptions>;
  update_records?: TQoreUpdateRecordsFunction<RestModifierOptions>;
  delete_records?: TQoreDeleteRecordsFunction<RestModifierOptions>;
  create_records?: TQoreCreateRecordsFunction<RestModifierOptions>;
  upsert_records?: TQoreUpsertRecordsFunction<RestModifierOptions>;
  search_options?: TQoreCrudOptions;
  upsert_options?: TQoreCrudOptions;
  create_options?: TQoreCrudOptions;
}

export type TQoreCrudOption = TQoreAppActionOption & {
  get_dependent_options?: never;
  get_dynamic_type?: never;
};

export type TQoreCrudOptions = Record<string, TQoreCrudOption>;

export type TQoreCreateRecordsFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
  Options extends TQoreOptions = TQoreOptions,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  records: Record<string, any[]>,
  create_opts?: { table: string; limit?: number; [key: string]: unknown } & TQoreMappedOptions<Options>,
) => Promise<Record<string, any[]>>;

export type TQoreUpdateRecordsFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
  Options extends TQoreOptions = TQoreOptions,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  update_fields: Record<string, any>,
  where_cond?: TQoreSearchRecordsWhereConditions,
  update_opts?: { table: string; limit?: number; [key: string]: unknown } & TQoreMappedOptions<Options>,
) => Promise<number>;

export type TQoreUpsertRecordsResultCode = 'inserted' | 'updated' | 'verified' | 'unchanged' | 'deleted';

export type TQoreUpsertRecordsFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
  Options extends TQoreOptions = TQoreOptions,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  records: Record<string, any[]>,
  upsert_opts?: { table: string; limit?: number; [key: string]: unknown } & TQoreMappedOptions<Options>,
) => Promise<TQoreUpsertRecordsResultCode[]>;

export type TQoreDeleteRecordsFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
  Options extends TQoreOptions = TQoreOptions,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  where_cond?: TQoreSearchRecordsWhereConditions,
  delete_opts?: { table: string; limit?: number; [key: string]: unknown } & TQoreMappedOptions<Options>,
) => Promise<number>;

export type TQoreGetTableListFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
> = (context: TQoreAppActionFunctionContext<RestModifierOptions>) => Promise<string[]> | string[];

export type TQoreGetRecordTypeFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  tableName: string,
) => Promise<TQoreTypeObject> | TQoreTypeObject;

export type TQoreSearchRecordsFunction<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
  Options extends TQoreOptions = TQoreOptions,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  where_cond?: TQoreSearchRecordsWhereConditions,
  search_opts?: { table: string; limit?: number; [key: string]: unknown } & TQoreMappedOptions<Options>,
) => Promise<TQoreSearchRecordsIterator<RestModifierOptions>>;

export const isQoreRecordSearchFieldReference = (arg: unknown): arg is TQoreSearchRecordsFieldReference => {
  return arg !== null && typeof arg === 'object' && 'field' in arg;
};

export const isQoreRecordSearchExpression = (arg: unknown): arg is TQoreSearchRecordsWhereConditions => {
  return arg !== null && typeof arg === 'object' && 'exp' in arg && 'args' in arg;
};

export type TQoreRecordSearchValue =
  | TQoreSearchRecordsExpression
  | TQoreSearchRecordsFieldReference
  | TQoreSearchRecordsValue;

export type TQoreSearchRecordsWhereConditions = {
  exp: string;
  args: Array<TQoreRecordSearchValue>;
};

export type TQoreSearchRecordsExpression = TQoreSearchRecordsWhereConditions;

export type TQoreSearchRecordsFieldReference = {
  field: string;
};

export type TQoreSearchRecordsValue = { value: any };

export type TQoreSearchRecordsIterator<
  RestModifierOptions extends Record<string, IQoreConnectionOption> = Record<string, IQoreConnectionOption>,
> = (
  context: TQoreAppActionFunctionContext<RestModifierOptions>,
  block_size: number,
) => Promise<Record<string, any[]> | null> | Record<string, any[]> | null;

export const EQoreRecordBasedAppErrorCodes = {
  DUPLICATE_RECORD: 'DUPLICATE-RECORD',
} as const;
