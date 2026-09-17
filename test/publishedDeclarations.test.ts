import { builtinModules } from 'module';
import path from 'path';
import ts from 'typescript';
import pkg from '../package.json';

/**
 * What a consumer compiles against is `dist/**\/*.d.ts` and nothing else
 * (`files` publishes only `dist`), so every import in a declaration must
 * resolve there or to a package the consumer installs with this one.
 *
 * `QorusOptions.ts` imported its helper types from `'../src'`. That compiles
 * here, and emits `import ... from '../src'` into `dist/QorusOptions.d.ts` —
 * a directory no consumer has, so the types silently became `any` wherever
 * `skipLibCheck` hid the error.
 *
 * The declarations are emitted in memory from `tsconfig.prod.json`, the build
 * that is published.
 */
const root = path.resolve(__dirname, '..');

interface IDeclaration {
  file: string;
  imports: string[];
}

const emitDeclarations = (): { outDir: string; declarations: IDeclaration[] } => {
  const configPath = path.join(root, 'tsconfig.prod.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const outDir = parsed.options.outDir as string;
  const program = ts.createProgram(parsed.fileNames, {
    ...parsed.options,
    noEmit: false,
    declaration: true,
    declarationMap: false,
    emitDeclarationOnly: true,
  });
  const declarations: IDeclaration[] = [];
  const result = program.emit(
    undefined,
    (fileName, text) => {
      if (fileName.endsWith('.d.ts')) {
        declarations.push({
          file: fileName,
          imports: ts.preProcessFile(text, true, true).importedFiles.map(({ fileName: imported }) => imported),
        });
      }
    },
    undefined,
    true,
  );
  const errors = result.diagnostics.map(({ messageText }) => ts.flattenDiagnosticMessageText(messageText, '\n'));
  if (errors.length) {
    throw new Error(`declaration emit failed:\n${errors.join('\n')}`);
  }
  return { outDir, declarations };
};

/** `@scope/name/deep/path` → `@scope/name`; `name/deep` → `name`. */
const packageOf = (specifier: string): string => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

describe('the published declarations', () => {
  jest.setTimeout(120000);

  const { outDir, declarations } = emitDeclarations();
  const relative = (file: string) => path.relative(outDir, file);

  it('are emitted for the entry point', () => {
    // Guards the checks below against passing because nothing was emitted.
    expect(declarations.map(({ file }) => relative(file))).toContain('index.d.ts');
  });

  it('import nothing from outside the published directory', () => {
    const escaping = declarations.flatMap(({ file, imports }) =>
      imports
        .filter((specifier) => specifier.startsWith('.'))
        .filter((specifier) => {
          const target = path.resolve(path.dirname(file), specifier);
          return target !== outDir && !target.startsWith(`${outDir}${path.sep}`);
        })
        .map((specifier) => `${relative(file)}: ${specifier}`),
    );

    expect(escaping).toEqual([]);
  });

  it('import only packages a consumer installs with this one', () => {
    const installed = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys((pkg as { peerDependencies?: Record<string, string> }).peerDependencies ?? {}),
    ]);
    const undeclared = declarations.flatMap(({ file, imports }) =>
      imports
        .filter((specifier) => !specifier.startsWith('.') && !specifier.startsWith('/'))
        .filter((specifier) => !builtinModules.includes(packageOf(specifier)))
        .filter((specifier) => !installed.has(packageOf(specifier)))
        .map((specifier) => `${relative(file)}: ${specifier}`),
    );

    expect(undeclared).toEqual([]);
  });

  it('do not type file fields through reqraft, which itself depends on this package', () => {
    const throughReqraft = declarations.flatMap(({ file, imports }) =>
      imports
        .filter((specifier) => packageOf(specifier) === '@qoretechnologies/reqraft')
        .map((specifier) => `${relative(file)}: ${specifier}`),
    );

    expect(throughReqraft).toEqual([]);
  });
});
