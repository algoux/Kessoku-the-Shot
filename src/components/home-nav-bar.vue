<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject } from 'vue-property-decorator';
import { HomeState, ScreenOrientationState } from '@/typings/data';

import { NavBar, Image, Button, Icon, Popover } from 'vant';
import logo from '@/assets/favicon.png';
import { CirclePlay, ChevronDown } from 'lucide-vue-next';

@Options({
  components: {
    NavBar,
    Image,
    Button,
    Icon,
    CirclePlay,
    ChevronDown,
    Popover,
  },
})
export default class HomeNavBar extends Vue {
  logo = logo;
  showMenu = false;

  @Inject()
  homeState!: HomeState;

  @Inject()
  screenOrientation!: ScreenOrientationState;

  @Inject()
  logout!: () => Promise<void>;

  @Inject()
  openDeviceSettings!: () => void;

  menuActions = [
    { text: '设备设置', value: 'settings', icon: 'setting-o' },
    { text: '退出登录', value: 'logout', icon: 'user' },
  ];

  onMenuSelect(action: any) {
    this.showMenu = false;
    if (action.value === 'settings') {
      this.openDeviceSettings();
    } else if (action.value === 'logout') {
      this.logout();
    }
  }
}
</script>

<template>
  <NavBar class="home-header" :safe-area-inset-top="screenOrientation.isPortrait">
    <template #title>
      <div class="home-header-content">
        <Popover
          v-if="!screenOrientation.isPortrait"
          v-model:show="showMenu"
          :actions="menuActions"
          placement="bottom-start"
          @select="onMenuSelect"
        >
          <template #reference>
            <div class="userinfo userinfo-dropdown">
              <Image
                :src="logo"
                alt="Logo"
                width="34"
                style="margin-right: 0.5rem"
                fit="cover"
                round
              />
              <span>{{ this.homeState.userId }}</span>
              <ChevronDown
                :size="20"
                :class="{ 'icon-rotate': showMenu }"
                style="margin-left: 0.5rem"
              />
            </div>
          </template>
        </Popover>

        <div v-else class="userinfo">
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
    padding: 0 2rem;
    // background-color: rgba(255, 255, 255, 0.8);
    border: none;
    outline: none;

    & .userinfo {
      display: flex;
      align-items: center;

      &.userinfo-dropdown {
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 2rem;
        color: #fff;

        background: rgba(0, 0, 0, 0.5);
        transition: all 0.3s;

        .icon-rotate {
          transition: transform 0.3s;
          transform: rotate(180deg);
        }
      }
    }
  }
}
</style>
