# 原生微信小程序练习端

`apps/miniapp` 是在线考试系统新增的原生微信小程序客户端，与现有 H5 练习端 `apps/app` 并行维护。

## 当前范围

- 账号密码登录
- 已发布题库列表
- 题库详情与分类专项练习入口
- 顺序练习、错题练习
- 错题库列表
- 练习历史
- 练习结果页
- 手机与 iPad 的基础布局适配

## 本地接入步骤

1. 先启动后端：

```bash
npm run dev:server
```

2. 用微信开发者工具打开目录：

```text
apps/miniapp
```

3. 首次打开前，修改 [env.js](/Users/shixiaojun/Documents/日常工作/10_ProjectCode/OnlineExam/apps/miniapp/config/env.js)：

- 把 `ACTIVE_ENV` 设成 `dev`
- 本机调试器访问：`dev.apiBase` 可先用 `http://127.0.0.1:3000`
- 真机调试访问本地服务：把 `dev.apiBase` 改成你电脑的局域网 IP，例如 `http://192.168.1.20:3000`
- 外网测试：把 `ACTIVE_ENV` 改成 `test`，并填写自己的 `https` 测试域名
- 正式发布：把 `ACTIVE_ENV` 改成 `prod`，并填写自己的备案 `https` 正式域名

4. 在开发者工具里建议打开：

- `不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书`
- `编译时自动热重载`

5. 如果你有自己的微信小程序 AppID，把 [project.config.json](/Users/shixiaojun/Documents/日常工作/10_ProjectCode/OnlineExam/apps/miniapp/project.config.json) 里的 `appid` 从 `touristappid` 替换成真实值。

## 环境配置示例

```js
const ACTIVE_ENV = "dev";

const ENV_CONFIGS = {
  dev: {
    name: "本地开发",
    apiBase: "http://192.168.1.20:3000",
  },
  test: {
    name: "测试环境",
    apiBase: "https://test.example.com",
  },
  prod: {
    name: "正式环境",
    apiBase: "https://exam.example.com",
  },
};
```

## 正式发布前必须完成

- 准备已备案域名
- 为域名配置 HTTPS 证书
- 在微信小程序后台配置“合法请求域名”
- 把 `env.js` 中的 `ACTIVE_ENV` 切换到 `prod`
- 把 `prod.apiBase` 改成正式服务地址

## 目录说明

- `app.*`: 小程序全局配置与全局样式
- `config/env.js`: API 地址与超时配置
- `utils/`: 请求、登录态、本地缓存、文案格式化
- `pages/login`: 登录页
- `pages/home`: 题库首页
- `pages/bank`: 题库详情页
- `pages/practice`: 答题页
- `pages/wrong`: 错题库页
- `pages/history`: 历史记录页
- `pages/result`: 结果页

## 已知后续事项

- 还没有接入微信原生身份体系，当前仍复用现有账号密码登录
- 还没有在微信开发者工具和真实 iPad 上完成人工验收记录，需要你下一步按设备做一次联调签收
