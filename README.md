# Datapack Language Server

## 计划支持功能

* 编辑器命令：如注释、取消注释、生成命令等
* Tag、名称、假名定义，使用注释，格式：`#define <类型> <名称>`，如 `#define tag a`
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

命令补全、检查等资料来自于 commands.json（不是mc里的，是自制的） 。下文将以 CommandNode 代表 commands.json 内的不同节点，ArgumentNode 代表一整个 Argument 节点，包括解析出的数据、源字串等。

NBT 等资料处理亦与上方做法大同小异。

### 解析器

* 使用 pull parser，即向 line 物件获取下一个字符。这样可以在不需要有之后的 argumentNode 的时候获取到之后的字符，也可以让 line 物件得知解析时影响到的其他 argumentNode。
* 回传  `ParserResult`。
* 尽量解析，遇到错误尝试加到解析错误列表并且跳过。真的跳不过才把之后的东西都放进那 node 里以不对该行之后部分进行解析（应当是稀有情况）。

解析器主要分为两种：
* 分派解析器：把工作分配给实际解析器。在所有解析器均不能解析（不只是错误，而是完全无法解析）的时候，采取特别做法（只有一个 child 的话，则把字串强行当作该 Node，设置错误信息，并且尝试之后解析；不止一个 children 的话，则把之后的命令设置为特殊 ArgumentNode 并且显示为错误）。
* 实际解析器：检查字符是否吻合，如果吻合则继续解析，尝试忽略错误尽量解析，返回解析结果（不吻合则没有解析结果）及错误列表。（如果吻合，无论有没有错误都不会给下一个解析器解析，故此解析器解析的顺序相当重要）

对于较为复杂的参数，如 NBT、选择器等，可以在 CommandArgument 里的 parsedData 里生成树状结构进行解析。解析期间不应该修改 Node 的数据，而是应该 Clone 一个新的。修改时应该找出需要修改的部分，只对该部分（可能包括之后部分）进行解析。

> 屎一样的例子:
> 比如现在有一条命令: `give @p stone`
> 其 CommandArgument:
>     ['give', ' ', '@p[]', ' ', 'stone']
>
> 假设我们要把 [8, 8) 的字符改为 `advancement`
> 解析的时候，line会找出那修改覆盖的第一个及最后一个 CommandArgument，这次两者都是 `@p`
> 然后line会调用 '@p' 里的 modify，传入 (4, 4, 'advancement')
> '@p'（选择器）的 modify 会为这修改找出覆盖的第一个及最后一个 node，这情况就是 '['，改为 '[advancement' 并且设置 modified tag 为 true。
> 然后会删除'[' 到 '[' 之间的CommandArgument，简单来说就是啥也不用删除
> 之后，如果第一个覆盖到的CommandArgument，这情况下是 '@p[]'，有提供 parse 函数，这情况下有提供，就调用这个parse函数。否则则调用 root 的 parse 函数，传入前一个 node 及 当前 node 的开始 > index。
>
> 在选择器里，由于我们第二个 Node 都被改了，所以我们会尝试重新解析第二个 node。
> 解析到'['，也就是parameter的开始，然后解析到'advancement'，确定为parameter的key。然后我们解析到 ']'，按理说key之后应该是'='和value的，而不是直接出现']'，所以我们会加入一个错误，不过由> 于这错误可以被接受，所以我们会接受那个']'并且完成对选择器的解析，返回一个Selector的CommandArgument。
>
> 然后，我们的line接收到那Selector的Command argument，调用 provider 查看是否需要继续解析，返回是不需要(接下来那个没被modify，并且provider的指针指向那argument，证明那玩意完全没被使用过)。
> 最后，我们把第一个解析的argument（选择器）到provider决定不需要继续解析的argument的前一个（也是选择器），替换为解析出来的argument（1个选择器）。
>
> > 注意，解析期间我们是不会对argument进行任何修改的，如果需要，我们应该对之前 argument 进行复制。

### 行处理

把文件拆成不同行。每行都有错误列表、定义列表、引用列表、数据节点，以及一些供解析器调用的函数。数据节点为 ArgumentNode[]。文件编辑将会被分拆成不同的行编辑处理。

> 注释整行为单一 ArgumentNode。

当有行修改的时候，如果整个 Argument Node 都在修改范围内，则删除该 Node。如果该 Node 只有部分内容在修改范围内，则把改变加入那 Node，并且标记为 modified。然后对第一个被修改的/在被删除的 Node 之后的 Node 开始解析。直至修改了的 Node 全部被解析完毕，并且 pull 的时候没影响到之后的 Node，以及之后的 Node 是当前 Node 的 child。

### 补全及提示

大致运作：找出前一个 Node，遍历所有 children，提供可能补全及提示。

如果所在是一个 CommandNode，则尝试调用解析器使用 CommandNode 的 ParsedData 提供补全数据（可能是树结构，实际运作和上方大同小异）。

### 文件缓存

所有文件都需要做缓存，缓存其定义列表及引用列表。缓存会统一储存到一个文件里方便之后使用，language server 开启期间亦会放在内存里。缓存目的是加速跳转定义、查找引用、重命名等操作。定义列表会存到一个全局的 set 里，以提供补全系统使用一些用户自定义数据来进行补全及报错。

可以使用编辑器命令来强制重新解析所有文件，来更新缓存及进行错误提示（对没打开的文件，打开的文件自动会有错误提示）。

### 错误处理

禁止抛出异常，一切可能抛出异常的函数应该回传 `Result<T, E>: Ok(T) | Err(E)` 或 `ParserResult`（上方已经对此进行定义）。

解析器的 Error 应该包括异常信息、可能情况及建议（如有）、错误范围（pull 的时候可以向 line 物件要求当前 index）。