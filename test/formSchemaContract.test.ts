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
    "import type { IQorusFormSchema, TQorusFormFieldSchema, TQorusType as TUiType } from '../src';",
    'export type TUnused = TUiType | TQorusFormFieldSchema;',
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
    // An object default that has a `type` is read as a typed default by the
    // form engines, so its `type` must be one.
    name: 'a typed default with a type nothing knows',
    source:
      "const p: IQorusFormSchema = { name: { type: 'string', default_value: { type: 'not-a-qorus-type', value: 'x' } } };",
    control: "const p: IQorusFormSchema = { name: { type: 'string', default_value: { type: 'string', value: 'x' } } };",
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
