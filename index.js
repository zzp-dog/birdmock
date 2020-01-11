var fs = require('fs');
var path  = require('path');
var {debounce}  = require('./util/util');
var child_process = require('child_process');

// 打印文字显示配置色
require('colors');

// 获取mocksPath的路径
var mocksPath;
if (process.env.mocksPath) {
    mocksPath = path.resolve(process.cwd(), process.env.mocksPath);
} else {
    mocksPath = path.resolve(__dirname, '../../../mocks');
}
var serverFilePath = path.resolve(__dirname, './server/server.js');
var worker = spawn(serverFilePath);

var stat = fs.statSync(mocksPath);
if (!(stat.isDirectory() && stat.isFile())) {
    return;
}

// 递归监听
fs.watch(mocksPath, {encoding:'utf8',recursive:true}, debounce(() => {
    worker.kill('SIGKILL');
    console.log('服务器重启中...'.yellow.bold);
    worker = spawn(serverFilePath);
}, 800, this));

/* daemon.js */
function spawn(mainModule) {
    var worker = child_process.spawn('node', [ mainModule ], {stdio: [process.stdin, process.stdout, process.stderr]});
    worker.on('exit', function (code) {
        if (code !== 0 && code !== null) {
            spawn(mainModule);
        }
    });
    // worker.stdout.on('data', function (data) {
    //     // 去掉末尾多余的换行符
    //     var content = data.toString();
    //     content = content.substr(0, content.length - 1);
    //     console.log(content);
    // });
    
    // worker.stderr.on('data', function (data) {
    //     // 去掉末尾多余的换行符
    //     var content = data.toString();
    //     content = content.substr(0, content.length - 1);
    //     console.log(content);
    // });
    return worker;
}