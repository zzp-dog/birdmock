
module.exports = {
    '/example': (params) => {
        if (params.id === '1') {
            return {
                status: 200,
                data: {
                    content: '我是示例mock返回的数据1'
                }
            }
        } else {
            return {
                status: 400,
                data: {
                    content: '我是示例mock返回的数据2'
                }
            }
        }
    }
}