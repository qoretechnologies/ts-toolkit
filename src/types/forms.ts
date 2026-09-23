import { IReqoreCollectionItemProps } from '@qoretechnologies/reqore/dist/components/Collection/item';
import { IReqorePanelAction, IReqorePanelProps } from '@qoretechnologies/reqore/dist/components/Panel';
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

/**
 * The `depends_on` grammar, reused wherever something has to be said only in
 * certain states of the SAME form.
 *
 * A bare `name` means the sibling has a value; `!name` means it has none;
 * `name=value` and `name!=value` compare the answer. Top-level entries are an
 * AND, and a nested array is an OR of its own entries.
 *
 * Both halves of a condition are evaluated against the values of one form. A
 * predicate cannot reach into a nested `arg_schema` sub-form or out to its
 * parent: those are separate value scopes, and a condition that silently never
 * fires would be worse than no condition at all.
 */
export type TQorusDependencyList = (string | string[])[];

export interface IQorusFormFieldMessage {
  title?: string;
  content: string;
  intent?: TReqoreIntent;
  /**
   * Show the message only while EVERY entry holds — {@link
   * TQorusDependencyList}.
   *
   * A message declared on a descriptor is otherwise static: it is served with
   * the schema and says the same thing whatever the user has typed. That is
   * right for a note and wrong for a warning about a COMBINATION, because an
   * always-on warning sitting over a valid configuration is one people learn to
   * scroll past — so it is not there when it finally means something.
   *
   * Sent by the Qorus server as `FieldUiMessageInfo::when`.
   */
  when?: TQorusDependencyList;
  /** Hide the message while every entry holds — the negative form of `when`. */
  unless?: TQorusDependencyList;
}

/**
 * One affordance offered beside a value, as a DESCRIPTOR rather than a node.
 *
 * Allowed values routinely travel through a `JSON.stringify(items)` memo key in
 * the form engines, and a rendered React element is circular through its fibre
 * — putting one on a value throws and takes the whole form down with it. So a
 * descriptor NAMES the component and hands it props; `as` is a function or a
 * memo object, which `JSON.stringify` simply omits.
 */
export interface IQorusUiComponentDescriptor {
  /**
   * The component to render. The renderer decides the default.
   *
   * Typed through the component library rather than through `react` directly:
   * `react` is not a dependency of this package, and a published declaration
   * may only import what a consumer installs with it.
   */
  as?: IReqorePanelAction['as'];
  /** Props handed to it. Keep them JSON-serialisable. */
  props?: Record<string, unknown>;
}

/** Where a popover opens, as the placements every renderer accepts. */
export type TQorusUiPlacement =
  | 'auto'
  | 'auto-start'
  | 'auto-end'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'left'
  | 'left-start'
  | 'left-end';

/**
 * A tooltip opened from a value's own row: a bare string, or options whose
 * content is a {@link IQorusUiComponentDescriptor} under the same
 * no-React-elements rule.
 *
 * Only the options every renderer honours are named. It is deliberately NOT
 * typed as the component library's own tooltip interface: this package is a
 * dependency of the renderers, and importing their types here made every
 * consumer install a second, older copy of them.
 */
export type TQorusUiTooltip =
  | string
  | {
      content?: string | IQorusUiComponentDescriptor;
      /**
       * What opens it. A hover popover is read-only; a click one is
       * interactive. `focus` opens it from the keyboard, which is the only
       * handler a reader who never uses a pointer can reach.
       *
       * All four the renderers honour, so all four are named here: a value's
       * tooltip is widened by reqraft to its component library's own tooltip
       * options, and a union narrower than that one cannot be re-declared on a
       * type extending this one.
       */
      handler?: 'hover' | 'click' | 'focus' | 'hoverStay';
      /** Milliseconds a hover must rest before it opens. */
      delay?: number;
      placement?: TQorusUiPlacement;
      title?: string;
      maxWidth?: string;
      maxHeight?: string;
      noArrow?: boolean;
      intent?: TReqoreIntent;
      icon?: IReqoreIconName;
    };

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
  /**
   * The value is offered but cannot be picked, and the reason is in
   * {@link messages}.
   *
   * Set by whoever already KNOWS — the server, for a sandbox or permission
   * context, a capability of the selected kind, or a requirement in another
   * scope that {@link depends_on} deliberately cannot reach. A renderer must
   * disable and say why rather than hide the value: a value that vanishes takes
   * its own explanation with it, and the reader is left looking for something
   * they were told exists.
   */
  disabled?: boolean;
  /**
   * The value is offered only while EVERY entry holds — {@link
   * TQorusDependencyList}, the same grammar and the same evaluator a FIELD's
   * `depends_on` uses, one level down.
   *
   * For what the form itself can decide. Where the answer depends on something
   * only the server knows, it sends {@link disabled} with a message instead;
   * the two render identically, so a reader never has to know which decided.
   *
   * @example
   * ```ts
   * // A scheme's cookie-only mode, offered once a cookie name is set:
   * { display_name: 'Cookie', value: { type: 'string', value: 'cookie' },
   *   depends_on: ['cookie_name'] }
   * ```
   */
  depends_on?: TQorusDependencyList;
  intent?: TReqoreIntent;
  badge?: IReqorePanelProps['badge'];
  messages?: IQorusFormFieldMessage[];
  /**
   * Affordances rendered in the value's BODY, under its description — each one
   * costs a line of its own.
   */
  actions?: IReqorePanelProps['actions'];
  /**
   * Affordances rendered in the value's TITLE BAR, inline with its name, where
   * a row already reserves the height.
   *
   * Separate from {@link actions} rather than a relocation of it: body actions
   * have been rendered under the description for as long as there have been
   * pickers, and callers size and lay them out on that basis.
   */
  title_actions?: IQorusUiComponentDescriptor[];
  /**
   * A tooltip on the whole ROW, not on one control inside it. Content that is
   * more than a sentence belongs here rather than in a description, which every
   * row pays for in height whether it is read or not.
   */
  tooltip?: TQorusUiTooltip;
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

  /**
   * The field is offered only while EVERY entry holds — {@link
   * TQorusDependencyList}.
   *
   * The two halves of the list mix freely (`[['kind=workflow', 'kind=service'],
   * 'name']` — one of the versioned kinds, AND a name to attach a version to),
   * which is what the server sends and what the form engines evaluate. It used
   * to be typed as `string[] | string[][]`, which cannot say that.
   */
  depends_on?: TQorusDependencyList;
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
