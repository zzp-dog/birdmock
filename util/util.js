var fs = require('fs');


/**
 * 遍历文件
 * @param {*} path 文件/文件夹 
 * @param {*} callback 回调函数
 */
function forEachFile(path, callback) {
    if (callback.break) {
        return;
    }
    if (path.endsWith('svn') || path.endsWith('git')) {
        return;
    }
    var stat = fs.statSync(path);
    if (stat.isDirectory()) {
        var files = fs.readdirSync(path);
        files.forEach((ele) => {
            forEachFile(path + '/' + ele, callback);
        });
        return;
    }
    callback(path);
}

/**
 * 返回防抖函数
 * @param {*} f 目标函数
 * @param {*} t 防抖时延
 * @param {*} c 上下文
 */
function debounce(f, t, c) {
    var timer;
    return function() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            f.apply(c || this, arguments);
        }, t);
    }
}

module.exports = {
    forEachFile,
    debounce
}