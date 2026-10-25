# 发行与验证

包标识 `dsh-sensenzi-conversation-search`，当前源码版本 `0.2.0-beta.3`，作者 sensenzi，2026 [MIT](<./LICENSE>)。[GitHub](<https://github.com/sensen-jo/dsh-conversation-search>)。

1. 发行包只包含显式清单内的源码、生成客户端、五份文档、许可证和六张合成示例图。排除任务报告、真实聊天、配置、依赖目录、Git凭据、日志和私有路径。
2. 兼容声明仅含 DSH `0.2.1-rc.2 || 0.2.1-rc.3`，peer 同范围。运行 `node build.mjs --check`，打包后在两个精确官方宿主的全新隔离 profile 验证 CLI 准入、Loader/Gateway、浏览器模块往返、卸载、Unicode 和错误隐私。合成测试不等于真实GUI验收。
3. 发布前核对包内每个文件及 hash、源码变化、图片元数据、作者匿名邮箱、Release标题/正文和下载清单；不读取真实凭据来比对，不公开任务报告中的本机路径。
4. 将已审查源码 fast-forward 推送至原仓库，创建不可覆盖的 `v0.2.0-beta.3` tag，发布 prerelease 与完整 tgz、SHA256SUMS.txt、无本机信息的简洁验证说明。用匿名公共端点读回提交/tag、下载资产和精确 hash。不能用push返回成功代替读回。
5. beta.3 仅通过本次GitHub Release发布；npm beta.1/beta.2与现有dist-tags保持。不得写beta.3的npm可装指令，亦不将GitHub Release当作市场收录更新。需要将来npm或市场发行时单独核对账号、最终字节与授权。
6. 保留已发布旧版本、tag、原npm包和现用配置。用户按兼容表选择版本，不自动升级其DSH/插件；同一profile只启用一个原文检索实现。回退只处理本插件所属配置，不覆盖共享profile。

Host与客户端来自同一个完整包。不捆绑第二套宿主、不新增索引、外部分析或模型调用。更多数据边界见 [PRIVACY](<./PRIVACY.md>)。
