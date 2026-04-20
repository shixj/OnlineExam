# Admin App

后台管理端，负责：

- 管理员登录
- 用户管理
- Excel 题库上传、校验、导入
- 题库发布与停用
- 练习记录查看

## Run

在项目根目录执行：

```bash
npm run dev:admin
```

如需改后端地址，可通过 `VITE_API_BASE` 覆盖，默认使用：

```text
同源 /api
```
