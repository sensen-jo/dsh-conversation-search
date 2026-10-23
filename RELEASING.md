# 发行与验证

包标识 `dsh-sensenzi-conversation-search`，版本 `0.2.0-beta.2`，作者／版权 sensenzi（2026），使用 [MIT](<./LICENSE>)。源码仓库：[sensen-jo/dsh-conversation-search](<https://github.com/sensen-jo/dsh-conversation-search>)。

1. 完整包只包含插件源码、生成客户端、使用／隐私／兼容性文档、MIT 和六张明确合成的示例图；Git 控制文件只入仓库。工程任务报告、日志、聊天和宿主配置不在发行范围。
2. 发布前检查 `node build.mjs --check`、显式打包清单和同 tar 的安装／运行。Host／客户端同包，使用 DSH 0.2.1-rc.2 / Node.js 24+；兼容性边界见 [兼容性说明](<./COMPATIBILITY.md>)。
3. 原 npm 名称 dsh-conversation-search 属于其他项目。npm 名称查无结果不表示已保留；发布前须重新核对账号、名称和最终字节，没有自动 publish 脚本。 发布前检查所有将公开的文件、提交作者邮箱、图片及元数据和账号联系信息；不要将私有配置、凭据、真实聊天或任务报告打包。源码提交使用 GitHub 匿名邮箱；npm 联系邮箱应为作者接受公开的地址。
   - 当前市场读取包的 `latest` manifest 并提供不带版本的安装命令；若 `latest` 指向 `0.2.0-beta.2`，该 beta 就是默认安装版本，不能据此称为稳定版。
   - 发布后读取精确注册表版本、下载 tar 验完整性与每个文件，再在独立空 DSH_HOME 的 web profile 安装并检查核心检索；市场入口另行核对。不修改用户正在使用的 profile。
4. 现用 dshmarket 对应 awesome-dsh-plugin 目录，当前收录申请为 PR #8546；原 1024 Store 是另一目录。按目标目录当前指南维护中英文描述和精确宿主支持范围，不能以 npm 可用替代市场收录验收。
5. 公开仓库、Release、npm 和市场 PR 分别操作。审核、合并、目录同步和实际可搜可装须逐项检查；通过某一检查不保证自动合并，不绕过维护者保留状态。

不捆绑第二套宿主、不新增持久索引或模型调用；截图的合成壳只用于展示。MIT 不等于兼容性或市场认证。
