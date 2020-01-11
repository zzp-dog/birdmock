# birdmock（结合mockjs开发的本地mock服务）

## 安装

``` shell
npm i @bigbigbird/mock -D
```

## mock配置

- 优先读取mocksPath的路径，否则需要在项目执行命令下的那个目录建立mocks文件夹！！！

- 接口放在指定路径（如果指定了mocksPath的路径）或mocks目录下

```js
module.exports = {
    'user/getInfo' : () => {
        a: 2
    },
    'user/login': {
    }
}
```

## vue.config.js

``` js

// vue.config.js的样例
var appConfig = require('@bigbigbird/mock/app.config');
// 服务器存放打包文件的目录
var publicPath = '/目录';
if (process.env.NODE_ENV === 'dev') { // 开发环境
    publicPath = '/';
}
module.exports = {
    // 配置静态资源访问的根文件夹
    publicPath: publicPath,
    devServer: {
        overlay: {
            warnings: false, // 消除警告
            errors: true
        },
        proxy: appConfig.proxy
    }
}
```

## package.json

``` json
"scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint",
    "start": "cross-env NODE_ENV=dev vue-cli-service serve",
    "mock": "birdmock",
    "mock:proxy": "cross-env proxy=http://39.97.33.178:80 birdmock"
  }
```
