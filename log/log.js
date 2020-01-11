// 日志配置
var log4js = require('log4js');

var logsPath = process.env.logsPath || process.cwd();

log4js.configure({
    "replaceConsole": true,
    "appenders": {
        "stdout": {
            "type": "stdout"
        },
        "dev": {
            "type": "dateFile",
            "backups": 3,
            "maxLogSize": 10485760, 
            "alwaysIncludePattern": true,
            "pattern": "yyyy-MM-dd.log",
            "filename": logsPath + "/logs/dev/"
        }
    },
    "categories": {
        "default": { "appenders": ["stdout", "dev"], "level": "info" }
    }
});

module.exports = log4js.getLogger('dev_env');