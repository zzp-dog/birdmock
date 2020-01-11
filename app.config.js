var config = require('./bird-mock');
var localProxy = config['local-proxy'];
var api = localProxy.api;
var proxy = new Object();

// 这里使用代理，url以api所代表的字符串会被替换成target，不使用代理会向应用框架请求
proxy[api] = {
    target: localProxy.url + ':' + localProxy.port,
    // changeOrigin默认是false：请求头中host仍然是浏览器发送过来的host
    // 如果设置成true：发送请求头中host会设置成target·
    changeOrigin: localProxy.changeOrigin
}

exports.appConfig = {
    proxy
}