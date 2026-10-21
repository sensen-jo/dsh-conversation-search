# 发行准备

当前版本为 dsh-conversation-search@0.2.0-beta.1，作者及版权署名 sensenzi，Copyright (c) 2026 sensenzi，使用 [MIT](<./LICENSE>)。仓库为[私有 GitHub 仓库](<https://github.com/sensen-jo/dsh-conversation-search>)。

1. 源码只包含本插件及使用说明；不要将任务记录、日志、凭据、聊天截图或个人配置加入发行。
2. Host 与客户端需由同一包提供；包字节确定后核构建、精确 tar 清单和同一 tar 的离线安装／运行。
3. 使用 DSH 0.2.0-rc.2、Node.js 24+；真实登录 GUI 的检索、原文、取消、清除与定位回退需独立验收。
4. 仓库当前保持私有。npm 名称可用性尚未实时核实；公开前还需确认账号控制、名称、下载来源、合成演示图和市场目录要求。
5. package 中 private=true 保留 npm 发布保护。公开仓库、npm 发布、Release 或市场目录提交均需具体授权。

无自动 publish 脚本，不在构建／打包时安装第二套宿主或上传会话。MIT 许可不等于市场审核或兼容性认证。
