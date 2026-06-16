const userAgent = process.env.npm_config_user_agent ?? '';

if (!userAgent.startsWith('npm/')) {
  console.error(
    [
      'This monorepo uses npm.',
      '',
      '  npm install',
      '',
      'Use npm in this repository.',
    ].join('\n'),
  );
  process.exit(1);
}
