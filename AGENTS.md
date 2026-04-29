
# AGENTS.md

# SentenceBreak 项目管理与开发执行规范

## 0. 项目定位

SentenceBreak 是一个用于长句拆分、句子结构分析、括号/嵌套结构处理、文本清洗与可视化辅助的文本处理项目。

本项目使用 `Git + GitHub` 进行版本管理，采用：

- 分支开发
- Pull Request 合并
- Tag 发版
- GitHub Release 记录
- TDD 优先
- 小步提交
- 可测试、可回滚、可维护

Codex 在执行本项目任务时，不只是代码生成工具，而应作为以下角色协同工作：

- 项目管理 Agent
- 技术实现 Agent
- 测试验证 Agent
- 安全审查 Agent
- 发布记录 Agent

---

## 1. Agent 工作原则

### 1.1 总原则

Codex 在处理任何任务前，必须先理解任务目标、影响范围和风险。

执行顺序必须为：

1. 阅读项目结构
2. 阅读相关代码
3. 明确变更目标
4. 制定小型执行计划
5. 编写或补充测试
6. 实现功能或修复问题
7. 本地验证
8. 总结变更
9. 给出风险与回滚建议

不得直接大范围重构，不得无说明修改核心架构。

---

### 1.2 禁止行为

Codex 不得：

- 直接在 `main` 分支开发
- 删除现有测试
- 绕过测试
- 硬编码密钥、Token、数据库密码
- 修改 `.env` 并提交
- 提交 `node_modules`、构建缓存、日志文件
- 擅自改变公开 API 行为
- 擅自修改数据库结构
- 擅自引入大型依赖
- 无测试地修改核心解析逻辑
- 为了通过测试而降低测试标准
- 将错误信息直接暴露给用户端
- 在未说明风险的情况下进行大范围重构
- 在未确认影响范围的情况下修改多个模块
- 在未验证的情况下声称任务完成

---

## 2. 项目管理 Agent 职责

Codex 在每次任务中需要自动判断任务类型，并采用对应流程。

### 2.1 任务类型

任务可归类为：

- `feature`：新增功能
- `fix`：缺陷修复
- `refactor`：代码重构
- `docs`：文档更新
- `test`：测试补充
- `chore`：工程维护
- `perf`：性能优化
- `ci`：CI/CD 配置修改
- `release`：版本发布准备

---

### 2.2 任务开始前必须输出

在实际改代码前，Codex 应先给出：

```text
任务类型：
目标：
影响范围：
计划修改文件：
测试策略：
潜在风险：
````

示例：

```text
任务类型：fix
目标：修复括号嵌套导致的句子拆分错误
影响范围：parser 模块、parser 单元测试
计划修改文件：
- src/parser/sentence_parser.py
- tests/test_sentence_parser.py
测试策略：
- 新增嵌套括号测试
- 保留原有长句拆分测试
潜在风险：
- 可能影响英文缩写、数字小数点、引号内句号的处理
```

---

## 3. GitHub 版本管理规范

### 3.1 分支策略

本项目使用 `Git + GitHub` 进行版本管理，采用：

```text
分支开发 + PR 合并 + Tag 发版 + Release 记录
```

分支说明：

* `main`：生产/可发布分支，必须保持稳定
* 禁止直接在 `main` 日常开发
* 所有开发必须从 `main` 拉新分支

---

### 3.2 分支命名规范

```text
feat/<topic>       新功能
fix/<topic>        缺陷修复
refactor/<topic>   重构
docs/<topic>       文档更新
test/<topic>       测试相关
chore/<topic>      工程维护
perf/<topic>       性能优化
ci/<topic>         CI/CD 修改
release/<version>  发版准备
```

示例：

```text
feat/sentence-parser-v2
fix/bracket-nesting-bug
refactor/rule-engine
test/parser-edge-cases
release/v0.4.0
```

---

### 3.3 日常开发流程

每次开发必须执行：

```bash
git checkout main
git pull origin main
git checkout -b feat/<topic>
```

修改完成后：

```bash
git status
git diff
git add -A
git commit -m "feat: add sentence parser v2"
git push -u origin feat/<topic>
```

然后发起 PR 到 `main`。

---

## 4. 提交规范：Conventional Commits

提交信息格式：

```text
<type>: <description>
```

允许的 `type`：

```text
feat      新功能
fix       修复问题
refactor  重构
docs      文档
test      测试
chore     工程维护
perf      性能优化
ci        CI/CD
release   发布相关
```

示例：

```text
feat: add long sentence split rule engine
fix: handle nested parenthesis in parser
test: add parser edge-case coverage
docs: update release process
refactor: simplify sentence boundary detection
```

要求：

* 每个 commit 只解决一个清晰问题
* commit 信息必须说明真实变更
* 不允许使用无意义提交信息，例如：

  * `update`
  * `fix bug`
  * `change files`
  * `temp`
  * `test`

---

## 5. Pull Request 规范

### 5.1 PR 创建前检查

创建 PR 前，Codex 必须确认：

* 当前分支不是 `main`
* 已同步最新 `main`
* 测试通过
* 构建通过
* 没有敏感信息
* 没有无关文件变更
* 没有调试代码残留
* 没有临时注释或无意义打印
* 没有未说明的大范围重构
* 没有降低测试标准

---

### 5.2 PR 模板

提交 PR 时使用以下模板：

```markdown
## Summary

- 本次改动内容：
- 变更原因：

## Changes

- [ ] 功能改动
- [ ] 缺陷修复
- [ ] 重构
- [ ] 文档更新
- [ ] 测试补充
- [ ] 工程化改动

## Test Plan

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] E2E 测试通过，如涉及关键流程
- [ ] 覆盖率 >= 80%，或说明原因

## Security Checklist

- [ ] 无硬编码密钥、Token、数据库密码
- [ ] 输入已校验
- [ ] 错误信息不泄露敏感细节
- [ ] 无危险依赖引入
- [ ] 无越权访问风险

## Risk & Rollback

- 风险点：
- 影响模块：
- 回滚方式：

## Screenshots / Demo

如涉及 UI 变更，请补充截图或说明。
```

---

## 6. TDD 开发规范

本项目优先采用 TDD：

```text
RED -> GREEN -> REFACTOR
```

### 6.1 RED：先写失败测试

新增功能或修复 bug 前，优先添加失败测试。

示例：

```text
输入：
This is a sentence (with nested (inner) brackets). Another sentence.

期望：
[
  "This is a sentence (with nested (inner) brackets).",
  "Another sentence."
]
```

---

### 6.2 GREEN：实现最小功能

只实现让测试通过所需的最小代码。

---

### 6.3 REFACTOR：重构优化

测试通过后再优化结构，避免一次性大改。

---

## 7. 测试规范

### 7.1 测试覆盖要求

测试至少覆盖：

* 正常输入
* 空输入
* 超长句子
* 中英文混合
* 括号嵌套
* 引号嵌套
* 缩写
* 小数点
* URL
* 邮箱
* Markdown 文本
* 多行文本
* 异常输入

覆盖率目标：

```text
>= 80%
```

---

### 7.2 Parser 模块重点测试场景

SentenceBreak 项目中，解析器相关逻辑是高风险模块。

修改以下模块时必须补充测试：

* sentence parser
* rule engine
* tokenizer
* bracket handler
* quote handler
* punctuation handler
* markdown cleaner
* text normalizer

重点 case：

```text
1. 英文小数点：
The value is 3.14. This is valid.

2. 英文缩写：
Dr. Smith went home. He was tired.

3. 嵌套括号：
This is a test (with nested (inner) content). Next sentence.

4. 引号：
He said, "This is not the end." Then he left.

5. URL：
Visit https://example.com/test. Then continue.

6. 中英文混合：
这是第一句话。This is the second sentence.

7. Markdown：
# Title
This is a paragraph. This is another sentence.

8. 邮箱地址：
Please email test@example.com. Then wait for reply.

9. 多行文本：
First line ends here.
Second line continues here.

10. 省略号：
This is not finished... But this is another sentence.
```

---

## 8. 代码质量规范

### 8.1 基础要求

代码必须满足：

* 命名清晰
* 函数职责单一
* 避免重复逻辑
* 避免过长函数
* 避免魔法数字
* 类型尽量明确
* 复杂逻辑必须有必要注释
* 不引入无意义抽象
* 不为了炫技而复杂化
* 不破坏现有接口兼容性

---

### 8.2 Parser 代码要求

解析器逻辑必须遵循：

* 规则可解释
* 行为可测试
* 边界情况可覆盖
* 新规则不得破坏旧规则
* 规则优先级必须明确

如果引入新规则，需要说明：

```text
规则名称：
解决问题：
触发条件：
优先级：
可能影响：
测试用例：
```

---

## 9. 安全规范

### 9.1 敏感信息

不得提交：

```text
.env
.env.local
.env.production
*.pem
*.key
*.crt
id_rsa
id_rsa.pub
数据库密码
API Key
JWT Secret
OpenAI Key
GitHub Token
服务器密码
```

推荐 `.gitignore`：

```gitignore
# Environment
.env
.env.*
!.env.example

# Python
__pycache__/
*.pyc
.venv/
venv/

# Node
node_modules/
npm-debug.log
yarn-error.log

# Build
dist/
build/
.next/

# Logs
*.log

# IDE
.vscode/
.idea/

# Database
*.db
*.sqlite

# Secrets
*.pem
*.key
*.crt
id_rsa*
```

---

### 9.2 如果误提交密钥

必须立即执行：

1. 轮换密钥
2. 从 Git 历史中清除
3. 强制推送修正后的历史
4. 检查 GitHub Secret Scanning 报警
5. 记录事故影响范围

---

## 10. 版本号规范：SemVer

采用：

```text
MAJOR.MINOR.PATCH
```

含义：

```text
MAJOR：不兼容变更
MINOR：向后兼容的新功能
PATCH：向后兼容的问题修复
```

示例：

```text
v0.1.0
v0.2.0
v0.2.1
v1.0.0
```

版本升级规则：

```text
修复 bug：PATCH +1
新增兼容功能：MINOR +1
破坏性变更：MAJOR +1
```

---

## 11. 发布流程：Tag + GitHub Release

### 11.1 发布前检查

发布前必须确认：

* `main` 是最新版本
* 所有测试通过
* 构建通过
* 文档更新完成
* CHANGELOG 或 Release Notes 已准备
* 没有高风险未解决问题
* 没有未合并的关键 PR

---

### 11.2 打 Tag

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "release: vX.Y.Z"
git push origin vX.Y.Z
```

---

### 11.3 GitHub Release Notes 模板

```markdown
# Release vX.Y.Z

## New Features

- 

## Fixes

- 

## Improvements

- 

## Breaking Changes

- None

## Upgrade Notes

- 

## Test Summary

- Unit tests:
- Integration tests:
- E2E tests:
- Coverage:
```

---

## 12. 紧急回滚流程

当线上版本出现严重问题时：

### 12.1 回滚步骤

1. 识别当前故障版本 Tag，例如：

```text
v0.4.0
```

2. 找到上一稳定版本，例如：

```text
v0.3.5
```

3. 快速部署上一稳定版本。

4. 从 `main` 拉修复分支：

```bash
git checkout main
git pull origin main
git checkout -b fix/hotfix-parser-crash
```

5. 修复后走正常 PR 流程。

6. 发布补丁版本：

```text
v0.4.1
```

---

## 13. Codex 执行任务时的标准输出格式

每次任务完成后，Codex 必须输出：

```markdown
## 任务完成总结

### 修改内容

- 

### 修改文件

- 

### 测试结果

- 

### 风险点

- 

### 回滚方式

- 

### 后续建议

- 
```

示例：

```markdown
## 任务完成总结

### 修改内容

- 修复了嵌套括号导致错误拆句的问题
- 新增了 bracket nesting 测试用例

### 修改文件

- src/parser/sentence_parser.py
- tests/test_sentence_parser.py

### 测试结果

- pytest passed
- coverage: 86%

### 风险点

- 复杂引号嵌套场景仍需补充测试

### 回滚方式

- revert commit: abc123

### 后续建议

- 增加 Markdown 表格场景测试
```

---

## 14. GitHub Settings 建议

建议在 GitHub 仓库中启用：

### Branch protection for `main`

推荐配置：

* Require pull request before merging
* Require approvals
* Require status checks to pass before merging
* Require branches to be up to date before merging
* Require conversation resolution before merging
* Restrict force pushes
* Restrict deletions

可选：

* Require linear history
* Squash merge only

---

## 15. GitHub Actions 建议

如果项目有测试，建议添加 CI。

示例 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        if: hashFiles('requirements.txt') != ''
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Python dependencies
        if: hashFiles('requirements.txt') != ''
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run Python tests
        if: hashFiles('requirements.txt') != ''
        run: |
          pytest --maxfail=1 --disable-warnings -q

      - name: Set up Node
        if: hashFiles('package.json') != ''
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Node dependencies
        if: hashFiles('package.json') != ''
        run: npm ci

      - name: Run frontend build
        if: hashFiles('package.json') != ''
        run: npm run build
```

---

## 16. Issue 管理规范

如果使用 GitHub Issues，建议使用以下标签：

```text
type: feature
type: bug
type: docs
type: refactor
type: test
type: chore
type: release

priority: high
priority: medium
priority: low

status: todo
status: in-progress
status: blocked
status: done
```

Issue 模板：

```markdown
## Problem

当前问题是什么？

## Expected Behavior

期望结果是什么？

## Actual Behavior

实际结果是什么？

## Steps to Reproduce

1. 
2. 
3. 

## Scope

影响范围：

## Acceptance Criteria

- [ ] 
- [ ] 

## Notes

补充说明：
```

---

## 17. 需求拆分规范

Codex 遇到复杂需求时，必须先拆分任务。

例如：

```text
需求：开发长句拆分规则引擎 v2
```

应拆成：

```text
1. 梳理现有 parser 逻辑
2. 增加规则配置结构
3. 增加标点边界识别
4. 增加括号保护逻辑
5. 增加引号保护逻辑
6. 增加 URL / 邮箱保护逻辑
7. 增加测试用例
8. 更新文档
```

不得一次性提交大而混乱的改动。

---

## 18. 验收标准

每个任务必须有明确验收标准。

格式：

```markdown
## Acceptance Criteria

- [ ] 功能符合需求描述
- [ ] 相关测试通过
- [ ] 不破坏旧功能
- [ ] 代码无明显重复
- [ ] 无敏感信息
- [ ] 文档已更新，如涉及使用方式变化
```

---

## 19. 开发命令清单

### Git

```bash
git status
git diff
git checkout main
git pull origin main
git checkout -b feat/<topic>
git add -A
git commit -m "feat: ..."
git push -u origin feat/<topic>
```

### Tag

```bash
git tag -a vX.Y.Z -m "release: vX.Y.Z"
git push origin vX.Y.Z
```

### 回滚

```bash
git revert <commit>
```

或者回到指定版本：

```bash
git checkout vX.Y.Z
```

---

## 20. 推荐给 Codex 的任务指令模板

使用 Codex 开发时，可以直接复制以下指令：

```text
请先阅读 AGENTS.md，然后严格按照项目管理 Agent 流程执行本次任务。

任务：

要求：
1. 先判断任务类型；
2. 先分析影响范围；
3. 不要直接修改 main；
4. 优先采用 TDD；
5. 先写测试，再实现；
6. 修改后运行相关测试；
7. 检查是否存在敏感信息；
8. 最后按照 AGENTS.md 的标准格式输出任务完成总结。
```

---

## 21. 复杂任务指令模板

如果任务较复杂，使用以下指令：

```text
请先阅读 AGENTS.md，并作为项目管理 Agent 拆分本次任务。

任务：

要求：
1. 不要立即大范围修改代码；
2. 先输出任务拆分；
3. 给出每个子任务的优先级；
4. 给出推荐分支名；
5. 给出测试策略；
6. 给出潜在风险；
7. 等待我确认后，再开始执行第一个子任务。
```

---

## 22. Bug 修复指令模板

```text
请先阅读 AGENTS.md，然后按照 fix 流程修复以下问题。

问题描述：

复现步骤：

期望结果：

实际结果：

要求：
1. 先新增能够复现该 bug 的失败测试；
2. 再进行最小修改；
3. 保证旧测试不被破坏；
4. 输出修改文件、测试结果、风险点和回滚方式。
```

---

## 23. 新功能开发指令模板

```text
请先阅读 AGENTS.md，然后按照 feature 流程开发以下功能。

功能描述：

验收标准：
- [ ] 
- [ ] 
- [ ] 

要求：
1. 先拆分实现步骤；
2. 先补充测试；
3. 不要破坏现有 API；
4. 不要引入不必要的大型依赖；
5. 完成后输出任务总结。
```

---

## 24. 发布指令模板

```text
请先阅读 AGENTS.md，然后按照 release 流程准备版本发布。

目标版本：

要求：
1. 检查 main 是否最新；
2. 检查测试和构建状态；
3. 汇总本版本变更；
4. 生成 Release Notes；
5. 给出 Tag 命令；
6. 给出发布风险与回滚方案。
```

---

## 25. 最终执行原则

Codex 在本项目中必须始终遵循：

```text
先理解，再计划；
先测试，再实现；
小步修改，小步提交；
所有变更通过 PR；
main 始终保持稳定；
每个版本必须可追溯；
每个问题必须可回滚；
每个核心逻辑必须可测试。
```