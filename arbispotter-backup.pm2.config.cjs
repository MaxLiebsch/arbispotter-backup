const version = process.env.APP_VERSION || require('./package.json').version;

module.exports = {
  apps: [
    {
      name: `ArbispotterBackup_${version}`,
      script: '/root/.nvm/versions/node/v20.15.1/bin/yarn',
      args: "--cwd '/root/arbispotter-backup' start",
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      node_args: '--max-old-space-size=4096',
      interpreter: '/root/.nvm/versions/node/v20.15.1/bin/node',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
