/*
 * Created Date: Saturday, August 22nd 2020, 11:09:54 pm
 * Author: 木懵の狗纸
 * ---------------------------------------------------
 * Description: birdmock本地服务（请求本地或代理转发）
 * ---------------------------------------------------
 * Last Modified: Sunday August 23rd 2020 11:16:15 pm
 * Modified By: 木懵の狗纸
 * Contact: 1029512956@qq.com
 * Copyright (c) 2020 ZXWORK
 */

var http = require('http');                     // http模块
var https = require('https');                   // https模块
var Mock = require('mockjs');                   // mockjs
var qs = require('querystring');                // 查询参数工具
var { getLogger } = require('../log/log');      // 日志
var { forEachFile } = require('../util/util');  // 递归文件，获取本机ip
const { gunzipSync } = require('zlib');
const { Buffer } = require('buffer');
require('colors');                              // 彩色字体

var paths = process.argv.slice(2);
var configPath = paths[0];
var mocksPath = paths[1];
var logsPath = paths[2];

/** 配置 */
var config = require(configPath);
var log4js = config.log4js;
var appenders = log4js.appenders;
var appenderKeys = Object.keys(appenders)
appenderKeys.forEach((key) => {
    if (appenders[key].type === 'stdout') return;
    appenders[key].filename = logsPath + '/birdmock';
});
log = getLogger(log4js);

/** 本地代理配置 */
var proxyConfig = config.proxy[config['localServerKey']];
if (!proxyConfig) {
    console.log(`无法开启本地服务代理，因为在配置文件中没有找到 ${'local-proxy-api-prefix'} 对应键值的代理配置`.red.bold);
    process.exit(0);
}

/** 本地服务地址 */
var localTarget = proxyConfig.target;
if (localTarget.indexOf('localhost') < 0 && localTarget.indexOf('127.0.0.1') < 0) {
    console.log(`无法开启本地服务代理，因为在配置文件中 ${'local-proxy-api-prefix'} 对应键值的代理配置不是本地服务的配置`.red.bold);
    process.exit(0);
}

// 判断是否要通过本地代理进行转发请求 true - 转发 false - 不转发
var localPort = Number(localTarget.split(':')[2]);
// 优先读取环境变量中的要代理的服务地址
var proxy = process.env.proxy || config['localServerProxy'];
var forwardMode = proxy && proxy !== 'localhost:' + localPort && proxy !== '127.0.0.1:' + localPort;

/** mock数据 */
var mocks = {};
forEachFile(mocksPath, (file) => {
    try {
        var mock = require(file);
        Object.assign(mocks, mock);
    } catch (e) {
        console.log('文件'.yellow + '['.green + file.red + ']'.green + `注册mock失败`.yellow + `\r\n原因：\r\n` + e);
    }
});

/** 本地服务器 */
var server;
if (!forwardMode) { // 本地模式
    server = http.createServer((req, res) => {
        var params;
        var rawData = '';
        var method = req.method;
        req.setEncoding('utf8');
        if (method === 'POST' || method === 'PUT') {
            req.on('data', (chunk) => { rawData += chunk; });
            req.on('end', () => {
                if (req.headers['content-type'].indexOf('application/json') > -1) {
                    params = JSON.parse(rawData);
                } else {
                    params = qs.parse(rawData);
                }
                response(req, res, params);
                log.info(`[${req.headers['host']}] [${req.url}]${req.method}=>请求参数:\r\n` + JSON.stringify(params, null, '\t'));
            });
        } else {
            params = qs.parse(req.url.split('?')[1]);
            response(req, res, params);
            log.info(`[${req.headers['host']}] [${req.url}]${req.method}=>请求参数:\r\n` + JSON.stringify(params, null, '\t'));
        }
    });
} else {  // 代理转发请求模式
    server = http.createServer((req, res) => {
        var params;
        var method = req.method;
        var arr = proxy.split(':');
        var hostname = arr[1].replace(/\//g, '');
        var changeOrigin = proxyConfig.changeOrigin;
        // 不允许请求代理到来源
        if (proxy === req.headers.referer) {
            console.log('无法将源请求代理到源服务~'.red.bold);
            process.exit(0);
        }
        var options = {
            protocol: arr[0] + ':', // 协议
            hostname: hostname,     // 主机
            path: req.url,          // 请求接口
            method: method,         // 请求方式
            headers: req.headers    // 请求头
        };
        // 判断协议
        var httpX;
        if (arr[0] === 'https') {
            httpX = https;
        } else if (arr[0] === 'http') {
            httpX = http;
        }
        // 端口不为80
        if (arr.length === 3) {
            options.port = parseInt(arr[2]);
        }
        // 将请求头的host设为target的host
        var port = options.port;
        if (changeOrigin) {
            req.headers.host = hostname + (port ? (':' + port) : '');
        }
        if (!req.headers['content-type']) {
            req.headers['content-type'] = "application/x-www-form-urlencoded;charset=UTF-8";
        }
        if (method === 'POST' || method === 'PUT') {
            var rawData = '';
            req.on('data', (chunk) => { rawData += chunk; });
            req.on('end', () => {
                if (req.headers['content-type'].indexOf('application/json') > -1) {
                    params = JSON.parse(rawData);
                } else {
                    params = qs.parse(rawData);
                }
                response1(httpX, options, params, req, res);
            });
            return;
        }
        params = qs.parse(req.url.split('?')[1]);
        response1(httpX, options, params, req, res);
    });
}

/**
 * 本地模式响应
 * @param {*} req 请求
 * @param {*} res 响应
 * @param {*} params  请求对象
 */
function response(req, res, params) {
    if (localTarget[localTarget.length - 1] === '/') {
        localTarget = localTarget.slice(0, -1);
    }
    var key = req.url.split('?')[0].replace(localTarget, '');
    var value = mocks[key] || { code: 400, msg: '未注册该接口~' };
    if (typeof value === 'function') { // 如果mockvalue为函数，则执行函数
        value = value(params);
    }
    value = Mock.mock(value);
    setTimeout(() => {
        res.end(JSON.stringify(value));
        // 响应日志
        log.info(`[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` + JSON.stringify(value, null, '\t'));
    }, (value.timeout || 0));
}

/**
 * 本地代理响应
 * @param {*} httpX 协议
 * @param {*} options 请求体
 * @param {*} params 请求参数
 * @param {*} req 被代理的请求
 * @param {*} res 代理响应
 */
function response1(httpX, options, params, req, res) {
    // 请求日志
    log.info(`[${req.headers['host']}] [${req.url}]${req.method}=>请求参数:\r\n` + JSON.stringify(params, null, '\t'));
    var req_ = httpX.request(options, (res_) => {
        var buffer = [];
        var resData = '';
        // 这里不设置字符编码，默认是Buffer对象（nodejs官网api有说明）
        res_.on('data', function (chunk) {
            buffer.push(chunk);
        });
        res_.on('end', function () {
            buffer = Buffer.concat(buffer);
            // 如果是gzip压缩的，需要解压以下
            if ((res_.headers['content-encoding'] || '').indexOf('gzip') > -1) {
                buffer = gunzipSync(buffer);
            }
            resData = buffer.toString('utf-8');
            res.end(resData);
            var obj;
            try {
                obj = JSON.parse(resData);
            } catch (e) {
                console.log('对方返回了非json格式数据~'.red.bold);
                obj = resData;
            }
            log.info(`[${req.headers['host']}] [${req.url}]${req.method}=>响应:\r\n` + JSON.stringify(obj, null, '\t'));
        })
    })
    req_.end();
}

server.listen(localPort, (err) => {
    var mode;
    var target;
    if (!forwardMode) { // 本地代理转发模式
        mode = '本地模式';
        target = localTarget;
    } else {
        mode = '代理模式';
        target = proxy;
    }
    console.log('='.repeat(5).rainbow.bold + `${mode}已启动`.green.bold + `{ proxy => ${target} } { 接口数量:${Object.keys(mocks).length} }`.yellow + '='.repeat(5).rainbow.bold);
});

process.on('SIGKILL', function () {
    process.exit(0);
});