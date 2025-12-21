<script lang="ts">
import { Vue, Options } from 'vue-class-component';

@Options({})
export default class App extends Vue {}
</script>

<template>
  <div class="container">Hello world</div>
</template>

<style scoped lang="less">
.container {
  height: 100vh;
  display: flex;
  flex: 1;
  justify-content: center;
  align-items: center;
}
</style>
