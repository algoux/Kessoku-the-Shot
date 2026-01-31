<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject } from 'vue-property-decorator';
import { HomeState, ScreenOrientationState } from '@/typings/data';

import { NavBar, Image, Button, Icon, Popover } from 'vant';
import logo from '@/assets/favicon.png';
import { CirclePlay, ChevronDown, CirclePause } from 'lucide-vue-next';

@Options({
  components: {
    NavBar,
    Image,
    Button,
    Icon,
    CirclePlay,
    ChevronDown,
    CirclePause,
    Popover,
  },
})
export default class HomeNavBar extends Vue {
  logo = logo;
  showMenu = false;
  @Inject()
  isReady!: boolean;

  @Inject()
  homeState!: HomeState;

  @Inject()
  screenOrientation!: ScreenOrientationState;

  @Inject()
  logout!: () => Promise<void>;

  @Inject()
  openDeviceSettings!: () => void;

  @Inject()
  changeReadyState!: () => Promise<void>;

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

  async onReadyClick() {
    await this.changeReadyState();
  }
}
</script>

<template>
  <NavBar class="home-header" :safe-area-inset-top="true">
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
            <div class="userinfo userinfo-dropdown" :class="isReady ? 'ready-state' : ''">
              <Image
                :src="logo"
                alt="Logo"
                width="34"
                style="margin-right: 0.5rem"
                fit="cover"
                round
              />
              <span class="shotName">{{ homeState.shotName }}</span>
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
          <span>{{ homeState.shotName }}</span>
        </div>

        <Button :type="isReady ? 'danger' : 'primary'" round @click="onReadyClick">
          <template #icon>
            <CirclePlay v-if="!isReady" size="18" color="#fff" />
            <CirclePause v-else size="18" color="#fff" />
          </template>
          <span> {{ isReady ? 'Cancel Ready' : 'Ready' }} </span>
        </Button>
        <span class="contest-info" v-if="screenOrientation.isPortrait" :class="{ 'ready-state': isReady }">
          {{ homeState.title }}
        </span>
      </div>
    </template>
  </NavBar>
</template>

<style scoped lang="less">
.ready-state {
  opacity: 0.5 !important;
}

.contest-info {
  position: absolute;
  bottom: 0;
  font-size: var(--desc-font-size);
}

.contest-info-landscape {
  color: #fff;
}

.home-header {
  :deep(.van-nav-bar__title) {
    width: 100%;
    max-width: 100%;
  }

  :deep(.van-button__icon) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  & .home-header-content {
    width: 100%;
    font-size: 1.5rem;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    position: relative;
    align-items: center;
    padding: 0rem 2rem;
    padding-bottom: 2rem;
    border: none;
    outline: none;
    box-sizing: border-box;

    & .userinfo {
      display: flex;
      align-items: center;

      & .shotName {
        font-size: var(--title-font-size);
      }

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
