# 明月扩展

插件使用交流群: 293470342

## 功能列表

-   迷人藤 (已完成)
-   梦幻矿山 (待开发)
-   精灵表演场 (待开发)

## 原理说明

明月已经很好的处理了农场的登录功能,
我们只要把 sync.json 里面的插件代码导入明月,
这样明月就会周期性地把授权信息传递给插件服务器,
我们在插件服务器这边就可以完成明月代码做不了的事情.

## 使用说明

下载 nodejs 的可执行程序 node.exe 放到目录下
根据自己需求修改配置文件 env.yml 与 default.yml,
执行 运行明月插件.bat 启动服务端,
将 sync.json 导入至明月的自定义执行里,
手动先执行一次将授权数据同步至服务端,
观察日志打印内容是否正常,
如果有异常情况可以加群反馈.

## 编译运行

安装 nodejs
执行命令 npm install -g yrm
执行命令 yrm use taobao
执行命令 npm install -g yarn
项目目录下执行命令 yarn
