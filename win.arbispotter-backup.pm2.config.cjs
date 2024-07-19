const version = process.env.APP_VERSION || require("./package.json").version;

module.exports = {
  apps: [
    {
      name: `ArbispotterBackup_${version}`,
      script: "yarn",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: 'production',
      },
    } 
  ],
};
