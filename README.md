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


```typescript
function parseLiteral(node: CommandNode, provider: StringProvider, lineNum: number): ParserResult<CommandArgument> {
    let i = 0;
    const predicate = (c)=> {
        if (i === node.data!.length) {
            return Result.createOk<boolean, string>(false);
        } else {
            if (c === node.data![i++]) {
                return Result.createOk<boolean, string>(true);
            } else {
                return Result.createErr<boolean, string>('Incorrect literal');
            }
        }
    }
    const result = provider.getSegment(predicate);
    if (result.isOk() && result.unwrap() === node.data!) {
        const result = {
            source: result.unwrap(),
            node: node,
            getErrors: ()=>[],
            editSource: (start: number, end: number, text: string)=>{
                defaultEditSource(result, start, end, text);
            }
        }
        return {
            result: result,
            errors: []
        };
    } else {
        return {errors: []};
    }
}
```

对于较为复杂的参数，如 NBT、选择器等，可以在 CommandArgument 里的 parsedData 里生成树状结构进行解析。

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