# Datapack Language Server

## 计划支持功能

* 编辑器命令：如注释、取消注释、生成命令等
* Tag、名称、假名定义，使用注释，格式：`# define <类型> <名称>`，如 `# define tag a`
* 错误提示
* 自动补全
* 悬浮字词提示
* 参数提示
* 转到定义（记分项、Tag等等）
* 寻找引用（记分项、Tag等，乃至命令函数等资源）
* document link: 把resource location 当作链接显示
* document link resolve: 跳转到 resource location 文件
* rename: 重命名记分项、Tag等。资源重命名则需要靠编辑器命令。

## 大致做法

### 资料来源

命令补全、检查等资料来自于 commands.json 。下文将以 sourceNode 代表 commands.json 内的不同节点（以及一个 key 属性储存该节点的 key），argumentNode 代表 sourceNode& argument data 合并而成的节点。Argument data 包括 argument 源字串及解析用数据。

NBT 等资料处理亦与上方做法大同小异。

### 解析器

* 使用 pull parser，即向 line 物件获取下一个字符。这样可以在不需要有之后的 argumentNode 的时候获取到之后的字符，也可以让 line 物件得知解析时影响到的其他 argumentNode。
* 回传  `ParserResult: {node?: 解析到的节点, errors?: 解析错误列表, refereces: 资源引用，如记分项、Tag、函数等等, end: 是否可以完结}`。node 和 error 至少需要存在一个，可以同时存在。
* 尽量解析，遇到错误尝试加到解析错误列表并且跳过。真的跳不过才把之后的东西都放进那 node 里以不对该行之后部分进行解析（应当是稀有情况）。

### 行处理

把文件拆成不同行。每行都有错误列表、定义列表、引用列表、数据节点，以及一些供解析器调用的函数。数据节点可能为 argumentNode[]、comment node 或是 definition node。文件编辑将会被分拆成不同的行编辑处理。以下为 argumentNode[] 行处理里的不同情况（相对于内存里的行列表数据）：

* 在行末增加字符（或添加一整行）：根据前一个node 来对字符进行处理，生成 argumentNode。
* 在行末删除字符：首个被影响到的 argumentNode，从那里开始重新解析。
* 其他情况，如在行首添加字符、在行中间删除字符等：计算首个被影响到的 argument Node，进行解析。如果 pull 到的字串不影响之后的节点，并且之后一个节点是本节点的子节点，则不需要对后方进行处理，否则则重复进行本步骤。

Comment node 或 definition node 则每次都需要重新解析。

#### 实现

先找出首个被影响的 node（算节点 raw string 长度），在此开始解析。如果到了修改开始的位置，则先提供修改的字串直至耗尽修改字符。

如果修改尚未被耗尽，或者 pull 到的字串影响了之后的节点，或者之后一个节点不是当前解析节点的子节点，则需要继续解析。

### 文件缓存

所有文件都需要做缓存，缓存其定义列表及引用列表。缓存会统一储存到一个文件里方便之后使用，language server 开启期间亦会放在内存里。缓存目的是加速跳转定义、查找引用、重命名等操作。定义列表会存到一个全局的 set 里，以提供补全系统使用一些用户自定义数据来进行补全及报错。

可以使用编辑器命令来强制重新解析所有文件，来更新缓存及进行错误提示（对没打开的文件，打开的文件自动会有错误提示）。

### 错误处理

禁止抛出异常，一切可能抛出异常的函数应该回传 `Result<T, E>: Ok(T) | Err(E)` 或 `ParserResult`（上方已经对此进行定义）。

解析器的 Error 应该包括异常信息、可能情况及建议（如有）、错误范围（pull 的时候可以向 line 物件要求当前 index）。