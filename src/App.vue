<template>
  <div id="app">
    <pre><code ref="json" class="json">{{res1|json}}</code></pre>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import axios from 'axios';
@Component({
  filters: {
    json(o: any) {
      return JSON.stringify(o, null, '\t');
    }
  }
})
export default class App extends Vue {
  res1: any = {};
  beforeMount() {
    /**
     * 开发环境会在接口前面加上'/api'，上面已经配置过以"/api"开头的接口
     * 会被代理到本地服务，如果localServerProxy或环境变量中proxy有服务地址，
     * 本地服务会代理请求到这个服务地址。
     */
    const baseURL = process.env.NODE_ENV === 'development' ? '/api' : '';
    var  http = axios.create({baseURL});
    http.get('/example?id=1').then(({data}: any) => {
      this.res1 = data;
      this.$nextTick(() => {
        if (!(<any>window).hljs) return;
        (<any>window).hljs.highlightBlock(this.$refs.json);
      })
    });
  }
}
</script>
