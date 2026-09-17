import { IReqoreCollectionItemProps } from '@qoretechnologies/reqore/dist/components/Collection/item';
import { IReqorePanelProps } from '@qoretechnologies/reqore/dist/components/Panel';
import { TReqoreIntent } from '@qoretechnologies/reqore/dist/constants/theme';
import { IReqoreAutoFocusRules } from '@qoretechnologies/reqore/dist/hooks/useAutoFocus';
import { IReqoreIconName } from '@qoretechnologies/reqore/dist/types/icons';
import type { DropzoneOptions } from 'react-dropzone';
import { IQorusExpression, IQorusExpressionSchema } from './expressions';
import { TQorusCustomUIType, TQorusType } from './qorus';

export type TQorusFormOperatorValue = string | string[] | undefined | null;

export interface IQorusFormField {
  type: TQorusType;
  value: any;
  is_expression?: boolean;
  op?: TQorusFormOperatorValue;
}

export type TQorusForm =
  | {
      [optionName: string]: IQorusFormField | undefined;
    }
  | undefined;

export type TQorusFlatForm = Record<string, any>;

export interface IQorusFormFieldMessage {
  title?: string;
  content: string;
  intent?: TReqoreIntent;
}

export interface IQorusAllowedValue<IMetadata extends Record<string, any> = Record<string, any>> {
  display_name: string;
  short_desc?: string;
  desc?: string;
  name?: string;
  value: {
    type: TQorusType;
    value?: unknown;
    is_expression?: boolean;
  };
  ui_type?: TQorusType;
  type?: TQorusType;
  disabled?: boolean;
  intent?: TReqoreIntent;
  badge?: IReqorePanelProps['badge'];
  messages?: IQorusFormFieldMessage[];
  actions?: IReqorePanelProps['actions'];
  icon?: IReqoreIconName;
  image?: string;
  metadata?: IMetadata;
}

export type TQorusFormFieldOnChangeEvents = 'refetch';

/**
 * The options each field type takes in `type_options`.
 *
 * `file` is typed with `react-dropzone`'s options, which is what reqraft's file
 * field hands them to. It is not read through reqraft's own props: reqraft
 * depends on this package, and importing its types here made every consumer
 * install a second, older reqraft.
 */
export type IQorusTypeOptionsMapper = {
  file: DropzoneOptions;
};

/** A default written with the type it holds — and, for an expression, `is_expression`. */
export interface IQorusFormFieldTypedDefaultValue {
  type: TQorusType;
  value?: unknown;
  is_expression?: boolean;
}

/**
 * A default written as the plain value. An object without `type` is a hash
 * value; one WITH `type` is read as a typed default by the form engines, so it
 * cannot be a plain hash.
 */
export type TQorusFormFieldPlainDefaultValue =
  | string
  | number
  | boolean
  | null
  | unknown[]
  | { type?: never; [key: string]: unknown };

/**
 * A field's `default_value`, in either shape the server sends it: the plain
 * value (`"default_value": 512` — Qore's `DataProviderOptionInfo.default_value`
 * is `auto`) or a typed default (`{"type": "bool", "value": {...},
 * "is_expression": true}`).
 */
export type TQorusFormFieldDefaultValue = IQorusFormFieldTypedDefaultValue | TQorusFormFieldPlainDefaultValue;

/**
 * What a field's `ui_type` names: a Qorus type, or an editor the consumer
 * registered in `IQorusCustomUITypes`.
 */
export type TQorusFormFieldUIType = TQorusType | TQorusCustomUIType;

export interface IQorusFormFieldSchemaBase {
  element_type?: TQorusType;
  ui_element_type?: string;

  value?: unknown | IQorusExpression;
  desc?: string;

  default_value?: TQorusFormFieldDefaultValue;
  default_value_desc?: string;
  default_value_display_name?: string;

  required?: boolean;
  required_groups?: string[];
  preselected?: boolean;
  sensitive?: boolean;

  allowed_values?: IQorusAllowedValue[];
  allowed_values_creatable?: boolean;

  // When type is 'list' each element in the list can have allowed values
  element_allowed_values?: IQorusAllowedValue[];
  element_allowed_values_creatable?: boolean;

  allowed_schemes?: IQorusAllowedValue[];
  arg_schema?: IQorusFormSchema;
  multiselect?: boolean;

  supports_custom_values?: boolean;
  supports_templates?: boolean;
  supports_references?: boolean;
  supports_styling?: boolean;
  supports_expressions?: boolean;

  default_view?: 'template' | 'expression';

  // URL to fetch expressions and operators for this field
  expressions?: IQorusExpressionSchema[];
  expressions_url?: string;
  server_expression_handling?: boolean;

  app?: string;
  action?: string;

  depends_on?: string[] | string[][];
  has_dependents?: boolean;
  on_change?: TQorusFormFieldOnChangeEvents[];

  /**
   * Map of {@code <prop-name-on-this-field's-renderer>} → {@code
   * <sibling-field-name>} that the form engine resolves at render time:
   * for each entry, the sibling field's current value is forwarded as a
   * runtime prop of the same name to this field's renderer. JSON-pure
   * (no closures, no transforms) — the receiving renderer decides how to
   * use the value.
   *
   * Distinct from {@link type_depends_on} (which triggers a schema refetch
   * when the named sibling changes) and {@link depends_on} (which gates
   * whether this field renders or validates). {@code inherit_props} only
   * threads values as render-time props.
   *
   * @example
   * ```ts
   * // A code-editor field whose syntax highlighting tracks a sibling
   * // language picker without an `on_change`/refetch round-trip:
   * {
   *   source: {
   *     type: 'string',
   *     ui_type: 'code-editor',
   *     inherit_props: { language: 'lang' },
   *   },
   *   lang: {
   *     type: 'string',
   *     default_value: 'qore',
   *     allowed_values: [
   *       { value: { type: 'string', value: 'qore' },   display_name: 'Qore'   },
   *       { value: { type: 'string', value: 'python' }, display_name: 'Python' },
   *     ],
   *   },
   * }
   * ```
   */
  inherit_props?: Record<string, string>;

  display_name?: string;
  short_desc?: string;
  sort?: number;

  disabled?: boolean;
  readonly?: boolean;
  /**
   * The field belongs to the form but gets no editor of its own: its value is
   * still carried, and can be required through `required_groups`, while other
   * fields supply it. The Qorus server hides a test step's `target` this way.
   */
  hidden?: boolean;

  intent?: TReqoreIntent;
  metadata?: Record<string, any>;
  rules?: ['valid_identifier'];
  tags?: IReqoreCollectionItemProps['tags'];

  options?: {
    file?: DropzoneOptions;
  };

  messages?: IQorusFormFieldMessage[];
  focusRules?: IReqoreAutoFocusRules;
  markdown?: boolean;

  get_message?: {
    action: string;
    object_type?: string;
    return_value?: string;
    message_data?: any;
    useWebSocket?: boolean;
  };

  return_message?: {
    action?: string;
    object_type?: string;
    return_value?: string;
    useWebSocket?: boolean;
  };

  stretch?: boolean;
}

/**
 * One field of a form.
 *
 * `type` is how the value is stored; the server sends a list when an option
 * accepts several (Qore's `DataProvider::getInfoAsData()`), and the form
 * engines use the first. `ui_type` names the editor, and is optional: most
 * server schemas carry none, and the engines fall back to `type`.
 */
export type TQorusFormFieldSchema =
  | ({
      type: keyof IQorusTypeOptionsMapper;
      ui_type?: keyof IQorusTypeOptionsMapper;
      type_options?: IQorusTypeOptionsMapper[keyof IQorusTypeOptionsMapper];
    } & IQorusFormFieldSchemaBase)
  | ({
      type: Exclude<TQorusType, keyof IQorusTypeOptionsMapper> | TQorusType[];
      ui_type?: Exclude<TQorusFormFieldUIType, keyof IQorusTypeOptionsMapper>;
    } & IQorusFormFieldSchemaBase);

export interface IQorusFormSchema {
  [optionName: string]: TQorusFormFieldSchema;
}

export interface IQorusFormOperator {
  type?: TQorusType;
  name: string;
  desc: string;
  supports_nesting?: boolean;
  selected?: boolean;
}

export interface IQorusFormOperatorsSchema {
  [operatorName: string]: IQorusFormOperator;
}

export interface IQorusFormFieldOnChangeMeta {
  events?: string[];
}
