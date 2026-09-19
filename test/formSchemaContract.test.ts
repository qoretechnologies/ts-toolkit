import path from 'path';
import ts from 'typescript';

/**
 * The form schema types describe what the Qorus server sends and what the
 * form engines render, so each case below is a schema one of them really
 * produces — or one that must stay an error.
 *
 * The cases are compiled with the TypeScript compiler rather than written as
 * plain assignments, so a failure names the case and the diagnostic instead of
 * failing the whole file to load, and a case that must NOT compile is checked
 * to fail for the reason it is here.
 */
const root = path.resolve(__dirname, '..');
const probe = path.join(root, 'test', '__formSchemaContractProbe__.ts');

const compilerOptions = (): ts.CompilerOptions => {
  const configPath = path.join(root, 'tsconfig.prod.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  return { ...parsed.options, noEmit: true, noUnusedLocals: false };
};

interface ICase {
  name: string;
  source: string;
}

interface IDiagnostic {
  code: number;
  message: string;
}

/** Compiles every case in one program and returns each case's diagnostics. */
const diagnose = (cases: ICase[]): Record<string, IDiagnostic[]> => {
  const header = [
    "import type { IQorusFormField, IQorusFormSchema, TQorusFormFieldSchema, TQorusType as TUiType } from '../src';",
    "import type { IQorusExpressionSchema, TQorusExpressionSchemaArg } from '../src';",
    'export type TUnused = TUiType | TQorusFormFieldSchema | IQorusExpressionSchema | TQorusExpressionSchemaArg | IQorusFormField;',
    // A consumer registers its own editor through the package entry point,
    // as the IDE does.
    "declare module '../src' {",
    '  interface IQorusCustomUITypes {',
    "    'test-reference': true;",
    '  }',
    '}',
  ];
  const lines: string[] = [...header];
  const caseAtLine: string[] = [];
  cases.forEach(({ name, source }) => {
    source.split('\n').forEach((line) => {
      caseAtLine[lines.length] = name;
      lines.push(line);
    });
  });
  const text = lines.join('\n');

  const options = compilerOptions();
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  host.getSourceFile = (fileName, languageVersion, ...rest) =>
    fileName === probe
      ? ts.createSourceFile(fileName, text, languageVersion, true)
      : getSourceFile(fileName, languageVersion, ...rest);
  host.fileExists = (fileName) => fileName === probe || fileExists(fileName);
  host.readFile = (fileName) => (fileName === probe ? text : readFile(fileName));

  const program = ts.createProgram([probe], options, host);
  const result: Record<string, IDiagnostic[]> = Object.fromEntries(cases.map(({ name }) => [name, []]));
  ts.getPreEmitDiagnostics(program).forEach((diagnostic) => {
    if (diagnostic.file?.fileName !== probe || diagnostic.start === undefined) {
      throw new Error(
        `unexpected diagnostic outside the probe: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
      );
    }
    const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const name = caseAtLine[line];
    if (!name) {
      throw new Error(
        `diagnostic in the probe header: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
      );
    }
    result[name].push({
      code: diagnostic.code,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    });
  });
  return result;
};

/** Schemas the server or a form engine produces; each must compile. */
const VALID: ICase[] = [
  {
    // AiCollectionMetadata.qc: `"type": Type::Int, "default_value": 512` — a
    // plain value, as Qore's `DataProviderOptionInfo.default_value` (`auto`) is.
    name: 'a plain number default',
    source: "const a: IQorusFormSchema = { chunk: { type: 'int', default_value: 512 } };",
  },
  {
    name: 'a plain boolean and string default',
    source: [
      'const b: IQorusFormSchema = {',
      "  enabled: { type: 'boolean', default_value: true, preselected: true },",
      "  label: { type: 'string', default_value: 'Orders' },",
      '};',
    ].join('\n'),
  },
  {
    // AiEndpointMetadata.qc / QorusHttpApiManagementHandler.qc: `("*",)`.
    name: 'a list default',
    source: "const c: IQorusFormSchema = { origins: { type: 'list', default_value: ['*'] } };",
  },
  {
    name: 'a hash default',
    source: "const d: IQorusFormSchema = { headers: { type: 'hash', default_value: { Accept: 'application/json' } } };",
  },
  {
    name: 'a null default',
    source: "const e: IQorusFormSchema = { parent: { type: 'string', default_value: null } };",
  },
  {
    // AiKnowledgeService.qc: `{"type": "string", "value": "related_to"}`.
    name: 'a typed default',
    source:
      "const f: IQorusFormSchema = { rel: { type: 'string', default_value: { type: 'string', value: 'related_to' } } };",
  },
  {
    // QorusBuiltinFsmApps.qc: a loop condition that defaults to an expression.
    name: 'an expression default',
    source:
      "const g: IQorusFormSchema = { cond: { type: 'bool', default_value: { type: 'bool', value: { args: [] }, is_expression: true } } };",
  },
  {
    // Most server schemas carry no `ui_type`; the engines fall back to `type`.
    name: 'a field without ui_type',
    source: "const h: IQorusFormSchema = { name: { type: 'string', required: true } };",
  },
  {
    name: 'a file field without ui_type',
    source: [
      'const i: IQorusFormSchema = {',
      "  source: { type: 'file', type_options: { accept: { 'text/javascript': ['.js'] } } },",
      '};',
    ].join('\n'),
  },
  {
    name: 'a file field with ui_type',
    source:
      "const j: IQorusFormSchema = { source: { type: 'file', ui_type: 'file', type_options: { multiple: false } } };",
  },
  {
    // TestEngine.qc `StepFormCommonOverrides`: a step's `target` is carried, and
    // required through its group, but other fields supply it.
    name: 'a field the form carries but does not show',
    source:
      "const r: IQorusFormSchema = { target: { type: 'string', required_groups: ['iface-kind', 'iface-name'], hidden: true } };",
  },
  {
    // MapperMetadata.qc: a list of mapper codes rendered by the object picker,
    // and QorusMapManager.qc:1351, where the same picker fills a string field.
    name: 'the object picker',
    source: [
      "const s: IQorusFormSchema = { codes: { type: 'list', ui_type: 'select-array' } };",
      "const t: IQorusFormSchema = { name: { type: 'string', ui_type: 'select-array' } };",
    ].join('\n'),
  },
  {
    // misc.ql:855 reads a value stored under either name.
    name: 'a value the object picker stores',
    source: [
      "const u: IQorusFormField = { type: 'select-array', value: [{ name: 'READ' }] };",
      "const v: IQorusFormField = { type: 'multi-select', value: ['READ'] };",
    ].join('\n'),
  },
  {
    // The grammar the form engines evaluate: top-level entries are an AND and a
    // nested one is an OR, and the two mix in one list. A test's subject version
    // field declares exactly this — one of the versioned kinds, AND a name to
    // attach a version to.
    name: 'a dependency list that mixes an any-of group with a bare name',
    source:
      "const da: IQorusFormSchema = { version: { type: 'string', depends_on: [['kind=workflow', 'kind=service'], 'name'] } };",
  },
  {
    // `!name` — the sibling has NO value. Mutual exclusion cannot be written
    // with `!=`, which requires the sibling to be answered.
    name: 'a dependency on a sibling being unanswered',
    source:
      "const db: IQorusFormSchema = { convert_to_openapi3: { type: 'bool', depends_on: ['!convert_from_nodeset2'] } };",
  },
  {
    // The same grammar one level down: the value is offered only while the
    // sibling holds the answer that makes it meaningful.
    name: 'an allowed value that depends on a sibling',
    source: [
      "const dc: IQorusFormSchema = { scheme: { type: 'string', allowed_values: [",
      "  { display_name: 'Cookie', value: { type: 'string', value: 'cookie' }, depends_on: ['cookie_name'] },",
      "] } };",
    ].join('\n'),
  },
  {
    // What only the server knows: it refuses the value and says why, and the
    // message carries the reason a renderer shows in place of the choice.
    name: 'an allowed value the server has already refused',
    source: [
      "const dd: IQorusFormSchema = { store: { type: 'string', allowed_values: [",
      "  { display_name: 'Local Filesystem', value: { type: 'string', value: 'file' }, disabled: true,",
      "    messages: [{ intent: 'warning', content: 'This sandbox denies the FILESYSTEM domain.' }] },",
      "] } };",
    ].join('\n'),
  },
  {
    // A warning about a COMBINATION, which a static message cannot say: it is
    // there only while the exemption it warns about is also on.
    name: 'a message that applies only to a combination',
    source: [
      "const de: IQorusFormSchema = { permissions: { type: 'string', messages: [",
      "  { intent: 'warning', content: 'Anonymous callers skip these entirely.', when: ['allow_anonymous=true'] },",
      "  { intent: 'info', content: 'Checked on every request.', unless: ['allow_anonymous=true'] },",
      "] } };",
    ].join('\n'),
  },
  {
    // The kind picker in the IDE: the explanation on the row's own hover and on
    // a control in its title bar, both as descriptors rather than nodes.
    name: 'an allowed value carrying its own row affordances',
    source: [
      "declare const Prose: (props: { explanation?: string }) => null;",
      "const df: IQorusFormSchema = { kind: { type: 'select-string', allowed_values: [",
      "  { display_name: 'Coverage: process', value: { type: 'string', value: 'process_coverage' },",
      "    title_actions: [{ as: Prose, props: { explanation: 'Qorus spreads its work.' } }],",
      "    tooltip: { handler: 'hover', delay: 300, placement: 'bottom-start', maxWidth: '460px',",
      "      content: { as: Prose, props: { explanation: 'Qorus spreads its work.' } } } },",
      "] } };",
    ].join('\n'),
  },
  {
    // Qore's DataProvider::getInfoAsData() sends an option's `type` as the list
    // of the types it accepts.
    name: 'a field that accepts several types',
    source: "const k: IQorusFormSchema = { timeout: { type: ['int', 'string'] } };",
  },
  {
    // MetadataActionContext.qc `MetadataObjectTypeNames`: an interface
    // selector's value is typed with the object's kind.
    name: 'every kind of Qorus object',
    source: [
      'const kinds: TUiType[] = [',
      "  'api-schema', 'schema', 'test', 'event', 'alertrule', 'alertsilence', 'business-process',",
      "  'release-config', 'ai-knowledge-profile', 'ai-solution-profile', 'auth-profile', 'ml-model',",
      "  'release-script', 'schema-script', 'test-script', 'config-item-values', 'installed-release',",
      '];',
    ].join('\n'),
  },
  {
    // reqraft's FormEngine takes `componentOverrides` keyed by ui_type and a
    // `rendererOnlyUiTypes` list: a consumer names its own editors, and
    // registers the names (see the header).
    name: 'a consumer-defined editor',
    source: [
      "const l: IQorusFormSchema = { ref: { type: 'string', ui_type: 'test-reference', supports_templates: true } };",
      "export const isReference = (field: TQorusFormFieldSchema) => field.ui_type === 'test-reference';",
    ].join('\n'),
  },
];

/**
 * Schemas that must not compile, each with a `control` that differs only in the
 * property under test and must compile — so a case fails for the reason it is
 * here, not for some other property it happens to leave out.
 */
const INVALID: (ICase & { control: string })[] = [
  {
    name: 'a type nothing knows',
    source: "const m: IQorusFormSchema = { name: { type: 'not-a-qorus-type' } };",
    control: "const m: IQorusFormSchema = { name: { type: 'string' } };",
  },
  {
    name: 'an editor nobody registered',
    source: "const q: IQorusFormSchema = { ref: { type: 'string', ui_type: 'unregistered-editor' } };",
    control: "const q: IQorusFormSchema = { ref: { type: 'string', ui_type: 'test-reference' } };",
  },
  {
    name: 'a picker nobody renders',
    source: "const w: IQorusFormSchema = { codes: { type: 'list', ui_type: 'array-picker' } };",
    control: "const w: IQorusFormSchema = { codes: { type: 'list', ui_type: 'select-array' } };",
  },
  {
    name: 'file options on a field that is not a file',
    source: "const n: IQorusFormSchema = { name: { type: 'string', type_options: { multiple: true } } };",
    control: "const n: IQorusFormSchema = { name: { type: 'file', type_options: { multiple: true } } };",
  },
  {
    name: 'a default that is code',
    source: "const o: IQorusFormSchema = { name: { type: 'string', default_value: () => 'x' } };",
    control: "const o: IQorusFormSchema = { name: { type: 'string', default_value: 'x' } };",
  },
  {
    // The grammar is exactly two levels deep: an AND of entries, each of which
    // is a name or an OR of names. A third level has no meaning — an OR of ORs
    // is the same OR — and the widening that let an any-of group sit beside a
    // bare name must not have opened the list to arbitrary nesting, which no
    // evaluator would know what to do with.
    name: 'a dependency nested deeper than the grammar goes',
    source:
      "const dz: IQorusFormSchema = { version: { type: 'string', depends_on: [[['too', 'deep']]] } };",
    control:
      "const dz: IQorusFormSchema = { version: { type: 'string', depends_on: [['kind=workflow', 'kind=service']] } };",
  },
  {
    // An object default that has a `type` is read as a typed default by the
    // form engines, so its `type` must be one.
    name: 'a typed default with a type nothing knows',
    source:
      "const p: IQorusFormSchema = { name: { type: 'string', default_value: { type: 'not-a-qorus-type', value: 'x' } } };",
    control: "const p: IQorusFormSchema = { name: { type: 'string', default_value: { type: 'string', value: 'x' } } };",
  },
];

/**
 * Entries of the expression catalogue, `GET /system?action=expressions&context=ui`
 * (qorus `SystemRestClassV8::argInfo()` over Qore's `DataProviderExpressionInfo`
 * and `DataProviderArgInfo`). Each is taken from a live instance's answer.
 */
const VALID_EXPRESSIONS: ICase[] = [
  {
    name: 'an expression with every field the server sends',
    source: [
      'const ea: IQorusExpressionSchema = {',
      "  type: 1, subtype: 1, name: 'starts-with', display_name: 'String Starts With',",
      "  short_desc: 'Returns `True` if the given value starts with the given characters',",
      "  desc: 'Returns `True` if the given value starts with the given characters', symbol: 'startsWith',",
      "  groups: ['Comparison'], role: 3, supports_pushdown: true,",
      "  render_template: '$arg[0].startsWith($arg[1], $arg[2])',",
      "  args: [], return_type: 'bool', ui_return_type: 'bool', varargs: false,",
      '};',
    ].join('\n'),
  },
  {
    // Qore's `DataProviderExpressionInfo.supports_pushdown` (DataProvider 3.5).
    name: 'an expression the backend cannot run itself',
    source:
      "const eb: IQorusExpressionSchema = { type: 2, subtype: 1, name: 'f', display_name: 'F', short_desc: 'f', desc: 'f', symbol: 'f', role: 3, supports_pushdown: false, args: [], return_type: 'auto', ui_return_type: 'any', varargs: false };",
  },
  {
    // `return_type` is the server's type name; `list` and `hash` carry their
    // element type (`ui_return_type` is the plain UI type).
    name: 'an expression that returns a list or a hash',
    source: [
      "const ec: IQorusExpressionSchema = { type: 2, subtype: 1, name: 'split', display_name: 'Split', short_desc: 's', desc: 's', symbol: 'split', role: 3, args: [], return_type: 'list<auto>', ui_return_type: 'list', varargs: false };",
      "const ed: IQorusExpressionSchema['return_type'] = 'hash<auto>';",
    ].join('\n'),
  },
  {
    name: 'a logic group',
    source:
      "const ee: IQorusExpressionSchema = { type: 1, subtype: 2, name: '&&', display_name: 'And', short_desc: 'a', desc: 'a', symbol: '&&', role: 3, args: [], return_type: 'bool', ui_return_type: 'bool', varargs: true, min_args: 2 };",
  },
  {
    // `required` is sent only when it is true.
    name: 'an optional argument',
    source:
      "const aa: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'string', ui_type: 'richtext', display_name: 'Options', short_desc: 'o', desc: 'o', sensitive: false };",
  },
  {
    // The `value` and `template` expressions declare no `arg_info`, so their
    // argument carries only what the signature gives.
    name: 'an argument with no description',
    source:
      "const ab: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'any', ui_type: 'any', required: true };",
  },
  {
    name: 'an argument with a default',
    source: [
      'const ac: TQorusExpressionSchemaArg = {',
      "  signature_type_code: 'any', name: 'bool', ui_type: 'bool', display_name: 'Ignore Case?',",
      "  short_desc: 'If True then case will be ignored', desc: 'If `True` then case will be ignored',",
      "  default_value: true, sensitive: false, required: true, ui_default_value: { type: 'bool', value: true },",
      '};',
    ].join('\n'),
  },
  {
    name: 'an argument with allowed values',
    source: [
      'const ad: TQorusExpressionSchemaArg = {',
      "  signature_type_code: 'any', name: 'string', ui_type: 'richtext', display_name: 'Options',",
      "  short_desc: 'o', desc: 'o', sensitive: false, allowed_values_creatable: false,",
      "  allowed_values: [{ display_name: 'Dot Matches Newline?', short_desc: 'd', desc: 'd', value: { type: 'richtext', value: 'RE_DotAll' } }],",
      '};',
    ].join('\n'),
  },
  {
    name: 'a list argument',
    source: [
      'const ae: TQorusExpressionSchemaArg = {',
      "  signature_type_code: 'any', name: 'list<string>', ui_type: 'list', element_type: 'string', ui_element_type: 'richtext',",
      "  display_name: 'YAML Serialization Options', short_desc: 'o', desc: 'o', sensitive: false,",
      "  element_allowed_values: [{ display_name: 'Canonical?', value: { type: 'richtext', value: 'Canonical' } }],",
      '  element_allowed_values_creatable: false,',
      '};',
    ].join('\n'),
  },
  {
    name: 'an argument with an example and labels',
    source: [
      'const af: TQorusExpressionSchemaArg = {',
      "  signature_type_code: 'any', name: 'softstring', ui_type: 'richtext', display_name: 'Regex', short_desc: 'r', desc: 'r',",
      "  sensitive: false, required: true, example_value: '^[A-Z][0-9]+$', label_before: 'matches', label_after: 'exactly',",
      '};',
    ].join('\n'),
  },
];

/** Expression entries that must not compile, each with a control as for form fields. */
const INVALID_EXPRESSIONS: (ICase & { control: string })[] = [
  {
    name: 'an argument whose UI type nothing knows',
    source:
      "const xa: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'x', ui_type: 'not-a-qorus-type' };",
    control: "const xa: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'x', ui_type: 'richtext' };",
  },
  {
    name: 'a list argument whose element UI type nothing knows',
    source:
      "const xb: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'list<x>', ui_type: 'list', ui_element_type: 'not-a-qorus-type' };",
    control:
      "const xb: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'list<x>', ui_type: 'list', ui_element_type: 'richtext' };",
  },
  {
    name: 'a UI default with a type nothing knows',
    source:
      "const xc: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'x', ui_type: 'bool', ui_default_value: { type: 'not-a-qorus-type', value: true } };",
    control:
      "const xc: TQorusExpressionSchemaArg = { signature_type_code: 'any', name: 'x', ui_type: 'bool', ui_default_value: { type: 'bool', value: true } };",
  },
  {
    name: 'a return type nothing knows',
    source: "const xd: IQorusExpressionSchema['return_type'] = 'not-a-qorus-type';",
    control: "const xd: IQorusExpressionSchema['return_type'] = 'list<auto>';",
  },
  {
    // Only a list or a hash carries an element type.
    name: 'a generic return type of a type that takes no element type',
    source: "const xe: IQorusExpressionSchema['return_type'] = 'bool<auto>';",
    control: "const xe: IQorusExpressionSchema['return_type'] = 'hash<auto>';",
  },
];

const codes = (diagnostics: Record<string, IDiagnostic[]>) =>
  Object.fromEntries(Object.entries(diagnostics).map(([name, list]) => [name, list.map(({ code }) => code)]));

describe('the form schema contract', () => {
  jest.setTimeout(60000);

  it('accepts every schema the server and the form engines produce', () => {
    expect(diagnose(VALID)).toEqual(Object.fromEntries(VALID.map(({ name }) => [name, []])));
  });

  it('rejects each invalid schema for the reason it is invalid', () => {
    const rejected = codes(diagnose(INVALID));
    const controls = diagnose(INVALID.map(({ name, control }) => ({ name, source: control })));

    expect(rejected).toEqual(Object.fromEntries(INVALID.map(({ name }) => [name, [2322]])));
    expect(controls).toEqual(Object.fromEntries(INVALID.map(({ name }) => [name, []])));
  });
});

describe('the expression catalogue contract', () => {
  jest.setTimeout(60000);

  it('accepts every entry the server sends', () => {
    expect(diagnose(VALID_EXPRESSIONS)).toEqual(Object.fromEntries(VALID_EXPRESSIONS.map(({ name }) => [name, []])));
  });

  it('rejects each invalid entry for the reason it is invalid', () => {
    const rejected = codes(diagnose(INVALID_EXPRESSIONS));
    const controls = diagnose(INVALID_EXPRESSIONS.map(({ name, control }) => ({ name, source: control })));

    expect(rejected).toEqual(Object.fromEntries(INVALID_EXPRESSIONS.map(({ name }) => [name, [2322]])));
    expect(controls).toEqual(Object.fromEntries(INVALID_EXPRESSIONS.map(({ name }) => [name, []])));
  });
});
