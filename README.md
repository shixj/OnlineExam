# Online Exam Platform

在线考试 MVP，当前包含四个部分：

- `apps/server`: 后端 API、SQLite 数据存储、Excel 导入校验
- `apps/admin`: 后台管理端
- `apps/app`: 练习端，按小程序交互组织并适配手机与 iPad 视口
- `apps/miniapp`: 原生微信小程序练习端，复用现有后端接口

## Requirements

- Node.js 25+
- npm 11+

## Install

```bash
npm install
```

## Local Run

分别开 3 个终端：

```bash
npm run dev:server
```

```bash
npm run dev:admin
```

```bash
npm run dev:app
```

默认访问地址：

- 后端：`http://localhost:3000`
- 后台：Vite 默认地址，通常是 `http://localhost:5173`
- 练习端：Vite 默认地址，通常是 `http://localhost:5174`

局域网访问：

- 前台练习端：`http://你的本机IP:5174`
- 后台管理端：`http://你的本机IP:5173`
- 后端接口：`http://你的本机IP:3000`
- 当前这台机器本次识别到的局域网 IP：`192.168.41.107`
- `apps/app` 与 `apps/admin` 已默认跟随当前访问主机名请求 `3000` 端口，因此用局域网 IP 打开页面时，会自动请求同一 IP 的后端

原生微信小程序端：

- 先启动后端 `npm run dev:server`
- 再使用微信开发者工具打开 `apps/miniapp`
- 如需真机访问本地后端，请把 `apps/miniapp/config/env.js` 中的 `API_BASE` 改成你电脑的局域网 IP 地址

## Default Accounts

- 后台管理员：`admin / admin123`
- 练习用户：`student1 / 123456`

## Common Commands

```bash
npm run build
```

构建全部应用。

```bash
npm test
```

运行后端自动化测试，覆盖：

- 登录与访问控制
- Excel 导入与发布
- 练习续做
- 错题库流程

## Question Bank Import

1. 登录后台
2. 下载 Excel 模板
3. 按模板整理题库
4. 上传后查看校验结果
5. 校验通过后导入
6. 手动发布题库版本

## Acceptance

自动化与人工验收文档：

- [验收清单](./docs/acceptance-checklist.md)
- [设备签收模板](./docs/device-signoff-template.md)

## Current Status

当前核心 MVP 已可运行，OpenSpec 还剩最后两项需要真实设备人工签收：

- `6.4` 触控、可读性、布局稳定性验证
- `7.4` 手机与 iPad 最终验收签收
