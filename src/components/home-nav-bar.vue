<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject } from 'vue-property-decorator';
import { HomeState } from '@/typings/data';

import { NavBar, Image, Button, Icon } from 'vant';
import logo from '@/assets/favicon.png';
import { CirclePlay } from 'lucide-vue-next';

@Options({
  components: {
    NavBar,
    Image,
    Button,
    Icon,
    CirclePlay,
  },
})
export default class HomeNavBar extends Vue {
  logo = logo;
  @Inject()
  homeState!: HomeState;
}
</script>

<template>
  <NavBar class="home-header" :safe-area-inset-top="true">
    <template #title>
      <div class="home-header-content">
        <div class="userinfo">
          <Image :src="logo" alt="Logo" width="34" style="margin-right: 0.5rem" fit="cover" round />
          <span>{{ this.homeState.userId }}</span>
        </div>
        <Button type="primary" round>
          <template #icon>
            <CirclePlay size="18" color="#fff" />
          </template>
          <span> Ready </span>
        </Button>
      </div>
    </template>
  </NavBar>
</template>

<style scoped lang="less">
.home-header {
  & .home-header-content {
    width: 100vw;
    height: 6rem;
    font-size: 1.5rem;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    left: 0;
    padding: 0 1rem;
    // background-color: rgba(255, 255, 255, 0.8);
    border: none;
    outline: none;

    & .userinfo {
      display: flex;
      align-items: center;
    }
  }
}
</style>
