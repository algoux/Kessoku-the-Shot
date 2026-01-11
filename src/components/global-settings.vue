<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject } from 'vue-property-decorator';

import { Form, CellGroup, Field, Button } from 'vant';

@Options({
  components: {
    Form,
    CellGroup,
    Field,
    Button,
  },
})
export default class GlobalSettings extends Vue {
    @Inject()
    logout!: () => Promise<void>;
}
</script>

<template>
  <div class="global-settings">
    <p class="title">全局配置</p>
    <Form>
      <CellGroup inset>
        <Field label="示例配置项" placeholder="请输入配置内容" />
      </CellGroup>
      <Button type="danger" round size="small" @click="logout">Logout</Button>
    </Form>
  </div>
</template>

<style lang="less" scoped>
.global-settings {
  width: 100%;
  height: 100%;
  padding: 5rem 1rem;

  & .title {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
}
</style>
