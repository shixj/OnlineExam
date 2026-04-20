// 使用方式：
// 1. 本地开发：保留 ACTIVE_ENV = "dev"，把 dev.apiBase 改成你的本机或局域网地址。
// 2. 测试环境：把 ACTIVE_ENV 改成 "test"，并填写可公网访问的 HTTPS 测试域名。
// 3. 正式发布：把 ACTIVE_ENV 改成 "prod"，并填写已备案、已配置到微信小程序“合法请求域名”中的 HTTPS 地址。
//
// 注意：
// - 微信小程序正式版不支持直接请求 http://127.0.0.1:3000 或公网 IP。
// - 正式环境必须使用 HTTPS 域名。

const ACTIVE_ENV = "test";

const ENV_CONFIGS = {
  dev: {
    name: "本地开发",
    apiBase: "http://127.0.0.1:3000",
  },
  test: {
    name: "测试环境",
    apiBase: "http://82.157.205.169:8080",
  },
  prod: {
    name: "正式环境",
    apiBase: "https://exam.example.com",
  },
};

const currentEnv = ENV_CONFIGS[ACTIVE_ENV] || ENV_CONFIGS.dev;

module.exports = {
  ACTIVE_ENV,
  ENV_NAME: currentEnv.name,
  API_BASE: currentEnv.apiBase,
  REQUEST_TIMEOUT: 15000,
};
