/**
 * The kinds of object Qorus manages. An option that selects one is typed with
 * its kind: `{ type: 'api-schema', value: 'customer-api' }`.
 *
 * Mirrors the server's metadata object kinds (`MetadataObjectTypeNames` in
 * qorus `Classes/MetadataActionContext.qc`), plus `qog`.
 */
export type TQorusInterfaces =
  | 'mapper'
  | 'workflow'
  | 'service'
  | 'job'
  | 'connection'
  | 'constant'
  | 'class'
  | 'errors'
  | 'fsm'
  | 'function'
  | 'group'
  | 'mapper-code'
  | 'queue'
  | 'pipeline'
  | 'sla'
  | 'step'
  | 'type'
  | 'value-map'
  | 'qog'
  | 'ai-collection'
  | 'ai-endpoint'
  | 'ai-guardrail'
  | 'ai-knowledge-profile'
  | 'ai-solution-profile'
  | 'alertrule'
  | 'alertsilence'
  | 'api-schema'
  | 'auth-profile'
  | 'business-process'
  | 'config-item-values'
  | 'event'
  | 'installed-release'
  | 'ml-model'
  | 'release-config'
  | 'release-script'
  | 'schema'
  | 'schema-script'
  | 'test'
  | 'test-script';

/* Types used in UIs, these are not 1:1 to Qore types */
export type TQorusStringCompatibleUIType =
  | 'binary'
  | 'date'
  | 'email'
  | 'string'
  | 'long-string'
  | 'enum'
  | 'url'
  | 'select-string'
  | 'file-as-string';
export type TQorusNumberCompatibleUIType = 'int' | 'integer' | 'float' | 'number';
/**
 * `select-array` and `multi-select` are the object picker: the server sends
 * `select-array` as a field's `ui_type` (`MapperMetadata.qc`,
 * `QorusMapManager.qc`) and reads a value stored under either name
 * (`lib/misc.ql`), the older one being what the legacy field submitted.
 */
export type TQorusListCompatibleUIType = 'list' | 'range' | 'free-list' | 'select-array' | 'multi-select';
export type TQorusHashCompatibleUIType = 'hash' | 'data' | 'rgbcolor' | 'free-hash';
export type TQorusNullCompatibleUIType = 'null' | 'nothing';
export type TQorusAnyCompatibleUIType = 'any' | 'auto';
export type TQorusBooleanCompatibleUIType = 'bool' | 'boolean';
export type TQorusSpecialUIType =
  | 'richtext'
  | 'data-provider'
  | 'context'
  | 'file'
  | 'processor-mappings'
  | 'tool-catalog'
  | 'code-editor';

export type TQorusType =
  | TQorusInterfaces
  | TQorusStringCompatibleUIType
  | TQorusNumberCompatibleUIType
  | TQorusListCompatibleUIType
  | TQorusHashCompatibleUIType
  | TQorusNullCompatibleUIType
  | TQorusAnyCompatibleUIType
  | TQorusBooleanCompatibleUIType
  | TQorusSpecialUIType;

/**
 * Editors a form engine's consumer registers itself, by name. reqraft's
 * `FormEngine` takes `componentOverrides` keyed by `ui_type` and a
 * `rendererOnlyUiTypes` list, so a field's `ui_type` may name an editor this
 * package has never heard of. A consumer declares its names here, and only
 * there, so every other name stays a type error:
 *
 * ```ts
 * declare module '@qoretechnologies/ts-toolkit' {
 *   interface IQorusCustomUITypes {
 *     'test-reference': true;
 *   }
 * }
 * ```
 *
 * The values are unused; the keys are the names.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IQorusCustomUITypes {}

/** An editor name a consumer registered in {@link IQorusCustomUITypes}. */
export type TQorusCustomUIType = keyof IQorusCustomUITypes;

export type QorusProgrammingLanguage = 'qore' | 'python' | 'java';

export interface QorusConfigItem {
  type: TQorusType;
  desc: string;
  strictly_local?: boolean;
  config_group?: string;
  sensitive?: boolean;
  prefix?: string;
  value: any;
  level?: string;
  is_set?: boolean;
  is_templated_string?: boolean;
}

export interface QorusInterfaceGroups {
  [groupName: string]: {
    name: string;
    enabled?: boolean;
    size: number;
  };
}

export interface QorusInterfaceTags {
  [tagName: string]: any;
}
