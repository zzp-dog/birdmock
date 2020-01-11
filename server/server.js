var http = require('http');
var path = require('path');
var Mock = require('mockjs');
var qs = require('querystring');
var log = require('../log/log');
var config = require('../bird-mock');
var {forEachFile} = require('../util/util');

// 打印文字显示配置色
require('colors');

// 本地服务器配置
var localProxy = config['local-proxy'];
var proxy = process.env.proxy;
var port = localProxy.port;

// 判断是否要通过本地代理进行转发请求 true - 转发 false - 不转发
var forwardMode = proxy && proxy !== 'localhost:' + port && proxy !== '127.0.0.1:' + port;

// 本地服务器地址
var localServer = localProxy.url + ':' + port + '/';

// mock数据
var mocks = {};
var mocksPath;
if (process.env.mocksPath) {
    // 子进程process.cwd() = 父进程process.cwd()
    mocksPath = path.resolve(process.cwd(), process.env.mocksPath);
} else {
    mocksPath = path.resolve(__dirname, '../../../../mocks');
}
forEachFile(mocksPath, (file) => {
    try {
        var mock = require(file);
        Object.assign(mocks, mock);
    } catch(e) {
        console.log('文件'.yellow + '['.green + file.red + ']'.green + `注册本次mock失败`.yellow + `\r\n原因：\r\n` + e);
    }
});

// 本地服务器
var server;
if (!forwardMode) { // 本地模式
    server = http.createServer((req, res) => {
        var ro;
        var rawData = '';
        req.setEncoding('utf8');
        switch(req.method) {
            case 'POST':
            case 'PUT' :
                req.on('data', (chunk) => { rawData += chunk;});
                req.on('end', () => {
                    if (req.headers['content-type'].indexOf('application/json') > -1) {
                        ro = JSON.parse(rawData);
                    } else {
                        ro = qs.parse(rawData);
                    }
                    response(req, res, ro);
                    log.info(`[${req.url}]${req.method}=>请求参数:\r\n` + JSON.stringify(ro,null,'\t'));
                });
                break;
            default: 
                ro = qs.parse(req.url.split('?')[1]);
                response(req, res, ro);
                log.info(`${req.method}=>请求参数:\r\n` + JSON.stringify(ro,null,'\t'));
                break;
        }
    })
} else {  // 代理转发请求模式
    server = http.createServer((req, res) => {
        var ro; // 请求对象
        var rawData = '';
        var arr = process.env.proxy.split(':');
        var options = {
            path:req.url,                                   // 请求接口
            port: +arr[2],                                  // 端口
            method: req.method,                             // 请求方式
            hostname: arr[1].replace('//', ''),             // 主机名或ip
            headers: {
                'Content-Type': req.headers['content-type']||'x-www-form-encoded' // 请求参数类型
            }
        };

        switch(req.method) {
            case 'POST':
            case 'PUT' :
                req.on('data', (chunk) => {rawData += chunk;});
                req.on('end', () => {

                    // 请求参数日志
                    if (req.headers['content-type'].indexOf('application/json') > -1) {
                        ro = JSON.parse(rawData);
                    } else {
                        ro = qs.parse(rawData);
                    }
                    log.info(`[${req.url}]${req.method}=>请求参数:\r\n` + JSON.stringify(ro,null,'\t'));
                    
                    var req_ = http.request(options, (res_) => {
                        var rawData = '';
                        res_.setEncoding('utf8');  
                        res_.on('data', function (chunk) {  
                            rawData += chunk;
                        }); 
                        res_.on('end', function(){
                            res.end(rawData);
                            log.info(`[${req.url}]${req.method}=>响应:\r\n` + JSON.stringify(JSON.parse(rawData), null, '\t'));
                        })
                    });

                    req_.write(rawData);
                    req_.end();
                });
                break;
            default:

                // 请求参数日志
                ro = qs.parse(req.url.split('?')[1]);
                log.info(`[${req.url}]${req.method}=>请求参数:\r\n` + JSON.stringify(ro,null,'\t'));
                
                var req_ = http.request(options, (res_) => {
                    var rawData = '';
                    res_.setEncoding('utf8');  
                    res_.on('data', function (chunk) {  
                        rawData += chunk;
                    }); 
                    res_.on('end', function(){
                        res.end(rawData);
                        log.info(`[${req.url}]${req.method}=>响应:\r\n` + JSON.stringify(JSON.parse(rawData), null, '\t'));
                    })
                })

                req_.end();
                break;
        }
    });
}

/**
 * 本地模式响应
 * @param {*} req 请求
 * @param {*} res 响应
 * @param {*} ro  请求对象
 */
function response(req, res, ro) {
    var key = req.url.replace(localServer, '').split('?')[0];
    var value = mocks[key] || {code: 400, msg: '找不到接口'};
    if (typeof vlaue === 'function') { // 如果mockvalue为函数，则执行函数
        value = value(ro);
    } 
    value = Mock.mock(value);
    setTimeout(() => {
        res.end(JSON.stringify(value));
        log.info(`[${req.url}]${req.method}=>响应:\r\n` + JSON.stringify(value, null, '\t'));
    }, (value.timeout || 0));
}

server.listen(localProxy.port, (err) => {
    var mode = '本地模式';
    var proxy = localProxy.url + ':' + localProxy.port;
    if (forwardMode) { // 本地代理转发模式
        mode = '代理模式';
        proxy = process.env.proxy;
    }
    console.log('*'.repeat(70).rainbow.bold);
    console.log('*'.repeat(5).rainbow.bold  + `${mode}已启动`.green.bold + `{ proxy => ${proxy} } { 接口数量:${Object.keys(mocks).length} }`.yellow + '*'.repeat(5).rainbow.bold);
    console.log('*'.repeat(70).rainbow.bold);
});

process.on('SIGKILL', function () {
    process.exit(0);
});