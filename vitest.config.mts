import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const src = resolve(import.meta.dirname, 'src');

/**
 * Custom Vite plugin for Angular JIT component resolution in Vitest.
 * 1. Inlines external `templateUrl` and `styleUrl` so Angular JIT doesn't require
 *    asynchronous ResourceLoader resolution.
 * 2. Generates JIT `propMetadata` for Angular Signal inputs and outputs so TestBed
 *    and ComponentRef.setInput() work seamlessly in Vitest.
 */
function angularJitResourcePlugin() {
  return {
    name: 'angular-jit-resource-plugin',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.ts') || id.includes('node_modules')) {
        return null;
      }

      const dir = dirname(id);
      let transformed = code;

      // Inline templateUrl
      transformed = transformed.replace(
        /templateUrl:\s*['"]([^'"]+)['"]/g,
        (_, relPath) => {
          const filePath = resolve(dir, relPath);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf8');
            return `template: ${JSON.stringify(content)}`;
          }
          return _;
        },
      );

      // Inline styleUrl
      transformed = transformed.replace(
        /styleUrl:\s*['"]([^'"]+)['"]/g,
        (_, relPath) => {
          const filePath = resolve(dir, relPath);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf8');
            return `styles: [${JSON.stringify(content)}]`;
          }
          return _;
        },
      );

      // Inline styleUrls
      transformed = transformed.replace(
        /styleUrls:\s*\[([^\]]+)\]/g,
        (fullMatch, pathsList) => {
          const urls = pathsList
            .split(',')
            .map((p: string) => p.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean);

          const styles = urls.map((u: string) => {
            const filePath = resolve(dir, u);
            return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
          });

          return `styles: ${JSON.stringify(styles)}`;
        },
      );

      // Auto-register propMetadata for signal inputs and outputs in JIT mode
      const classMatches = [...transformed.matchAll(/export\s+class\s+(\w+)/g)];
      for (const classMatch of classMatches) {
        const className = classMatch[1];
        if (!className) continue;

        // Find input() and output() properties
        const inputMatches = [...transformed.matchAll(/(?:readonly\s+)?(\w+)\s*=\s*input(?:\.required)?\s*<[^>]*>?\s*\(/g)];
        const outputMatches = [...transformed.matchAll(/(?:readonly\s+)?(\w+)\s*=\s*output\s*<[^>]*>?\s*\(/g)];

        if (inputMatches.length > 0 || outputMatches.length > 0) {
          const propEntries: string[] = [];
          for (const m of inputMatches) {
            propEntries.push(`${m[1]}: [{ ngMetadataName: 'Input', isSignal: true }]`);
          }
          for (const m of outputMatches) {
            propEntries.push(`${m[1]}: [{ ngMetadataName: 'Output' }]`);
          }

          transformed += `\nif (typeof ${className} !== 'undefined') {\n  (${className} as any).propMetadata = {\n    ...(${className} as any).propMetadata,\n    ${propEntries.join(',\n    ')}\n  };\n}\n`;
        }
      }

      return { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  plugins: [angularJitResourcePlugin()],
  resolve: {
    alias: {
      '@app': resolve(src, 'app'),
      '@features': resolve(src, 'app/features'),
      '@tasks': resolve(src, 'app/features/tasks'),
      '@dashboard': resolve(src, 'app/features/dashboard'),
      '@env': resolve(src, 'environments/environment.ts'),
      '@shared': resolve(src, 'app/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/main.ts'],
    },
  },
});
