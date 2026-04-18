# 发布工作流

本文档说明当前 DeepReader 的实际发布流程。

## 当前发布策略

DeepReader 目前采用 **手动下载安装包升级** 的策略。

这意味着：

- GitHub Actions 会自动构建并上传安装包
- GitHub Release 需要检查后再正式发布
- 当前版本 **不提供应用内自动更新**
- 用户升级时，需要前往 Releases 页面重新下载安装包

## 前置要求

1. GitHub Actions 配置完成
2. 已具备仓库的 push 权限
3. 本次改动已经在本地验证通过

## 标准发布流程

### 1. 更新版本号

确认以下版本号已经同步：

- `package.json`
- `packages/app/package.json`
- `packages/app/src-tauri/tauri.conf.json`
- `packages/app/src-tauri/Cargo.toml`

### 2. 提交代码并推送

```bash
git add .
git commit -m "chore: prepare release vx.x.x"
git push origin main
```

### 3. 创建并推送 tag

```bash
git tag -a vx.x.x -m "Release vx.x.x"
git push origin vx.x.x
```

### 4. 等待 GitHub Actions 构建

当前工作流会在 Windows runner 上自动完成：

- 安装依赖
- 构建桌面应用
- 生成 Release 资产
- 创建 Draft Release

查看构建状态：

`https://github.com/AlphaMao1/deepreader/actions`

### 5. 检查 Draft Release

进入 Releases 页面，确认：

- Release 标题正确
- 版本号正确
- 安装包已上传
- Release 说明已经更新

发布页面：

`https://github.com/AlphaMao1/deepreader/releases`

### 6. 发布正式 Release

确认无误后，将 Draft Release 发布为正式版本。

## Release Notes 建议模板

```markdown
## Summary
- 简述本次版本的核心变化
- 如果只是品牌、文案、素材更新，也直接写清楚

## Notes
- 说明是否包含功能行为变化
- 说明用户是否需要重新下载安装包升级
```

## 给用户的下载说明

建议在 Release Notes 里明确写清楚：

- 这是哪个版本
- 用户应下载哪个安装包
- 当前版本没有应用内自动更新
- 如需升级，请重新下载安装包

## 常见问题

### Q: 为什么用户没有自动更新提示？

因为当前版本没有启用应用内自动更新，这是当前的产品策略，不是构建异常。

### Q: 用户应该怎么升级？

去 GitHub Releases 页面下载新版安装包，重新安装即可。

### Q: Release 是 Draft 状态能给用户用吗？

不建议。应在确认资产和说明都正确后，再发布为正式 Release。

## 发布检查清单

- [ ] 版本号已同步
- [ ] 本地构建通过
- [ ] 代码已提交并推送
- [ ] tag 已创建并推送
- [ ] GitHub Actions 构建成功
- [ ] Draft Release 资产齐全
- [ ] Release Notes 已更新
- [ ] Release 已正式发布

## 相关文件

- `.github/workflows/release.yml`
- `packages/app/src-tauri/tauri.conf.json`
- `package.json`
- `packages/app/package.json`
- `packages/app/src-tauri/Cargo.toml`
