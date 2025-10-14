实现`acs ui`命令
执行该命令后，打开一个网页页面，例如`http://localhost:8888`


这个页面主要实现的功能是通过界面进行管理`~/.acs/config.json`

首先实现`acs config`这个命令的交互，实现修改、新增、删除、查看、切换配置
目前先实现claude这个cli的配置操作（acs config claude xxx），后续可能还有codex等ai编程工具(acs config codex xxx)
页面要求简洁、美观、交互简单