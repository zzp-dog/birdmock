module.exports = {
    devServer: {
        overlay: {
            warnings: false, // 消除警告
            errors: true
        },
        proxy: require('./birdmock/config.json').proxy
    }
}