const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
    plugins: [
      {
        name: 'external-deps',
        setup(build) {
          // Mark vscode as external (provided by VSCode runtime)
          build.onResolve({ filter: /^vscode$/ }, () => {
            return { path: 'vscode', external: true };
          });
          
          // Handle other dependencies - keep them bundled or external as needed
          build.onResolve({ filter: /^(ws|ip|nanoid|minimatch)$/ }, args => {
            // These should be bundled, so we don't mark them external
            return null;
          });
        },
      },
    ],
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
