import type { IQorusAllowedValue, IQorusFormFieldTypedDefaultValue } from './forms';
import { TQorusType } from './qorus';

/**
 * One argument of an expression, as `GET /system?action=expressions&context=ui`
 * sends it: the signature's type, merged with Qore's `DataProviderArgInfo` when
 * the expression declares one (qorus `SystemRestClassV8::argInfo()`).
 */
export type TQorusExpressionSchemaArg = {
  signature_type_code: string;
  /** The argument's type name as the server spells it (`softstring`, `list<string>`), without the `*` of an optional one. */
  name: string;
  ui_type: TQorusType;
  /** The element type name of a `list<...>` argument. */
  element_type?: string;
  ui_element_type?: TQorusType;
  /**
   * The description, which an expression without argument info (`value`,
   * `template`) does not send.
   */
  display_name?: string;
  short_desc?: string;
  desc?: string;
  sensitive?: boolean;
  label_after?: string;
  label_before?: string;
  /** The default as the plain value. */
  default_value?: any;
  /** The same default, typed for the UI. */
  ui_default_value?: IQorusFormFieldTypedDefaultValue;
  /** A value the argument accepts, as a hint. */
  example_value?: unknown;
  allowed_values?: IQorusAllowedValue[];
  allowed_values_creatable?: boolean;
  /** The values each element of a list argument may take. */
  element_allowed_values?: IQorusAllowedValue[];
  element_allowed_values_creatable?: boolean;
  /** Sent, as `true`, only for an argument that is not optional. */
  required?: boolean;
};

/**
 * An expression's return type as the server names it: a UI type (`string` is
 * sent as `richtext`), or a generic one with its element type (`list<auto>`,
 * `hash<auto>`).
 */
export type TQorusExpressionReturnType = TQorusType | `${'list' | 'hash'}<${string}>`;

export interface IQorusExpressionSchema {
  desc: string;
  short_desc: string;
  display_name: string;
  name: string;
  return_type: TQorusExpressionReturnType;
  ui_return_type: TQorusType;
  role: number;
  /** `1` for an operator, `2` for a function. */
  type: number;
  varargs: boolean;
  /** `1` for a normal expression, `2` for a logical group (`&&`, `||`). */
  subtype: 1 | 2;
  args: TQorusExpressionSchemaArg[];
  symbol: string;
  /**
   * Whether the data provider can run the expression itself; `false` means it
   * is only evaluated by the client (Qore DataProvider 3.5).
   */
  supports_pushdown?: boolean;
  from_server?: boolean;
  from_both?: boolean;
  min_args?: number;
  render_template?: string;
  return_type_first_arg?: boolean;
  return_type_arg_priority?: string[];
  groups?: string[];
}

export interface IQorusExpressionValue {
  exp?: string;
  args?: IQorusExpression[];
}

export interface IQorusExpression {
  value?: IQorusExpressionValue | any;
  type?: TQorusType;
  is_expression?: boolean;
  required?: boolean;
}
