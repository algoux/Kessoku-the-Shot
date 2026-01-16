<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Preferences } from '@capacitor/preferences';
import { HomePageIndexEnum, HomeState, GetContestInfoResDTO } from '@/typings/data';
import { Inject, Provide } from 'vue-property-decorator';
import { ScreenOrientationState } from '@/typings/data';

import { Button, Tabbar, TabbarItem, Popup } from 'vant';
import { User, Home, Settings } from 'lucide-vue-next';
import VideoContainer from '@/components/video-container.vue';
import GlobalSettings from '@/components/global-settings.vue';
import HomeNavBar from '@/components/home-nav-bar.vue';

@Options({
  components: {
    HomeNavBar,
    VideoContainer,
    GlobalSettings,
    Button,
    Tabbar,
    TabbarItem,
    Popup,
    User,
    Home,
    Settings,
  },
})
export default class HomeView extends Vue {
  show: boolean = false;
  @Provide()
  homeState: HomeState = {
    userName: '',
  };
  currentPageIndex: HomePageIndexEnum = HomePageIndexEnum.HOME;

  @Inject()
  screenOrientation!: ScreenOrientationState;

  async mounted() {
    const localState = await Preferences.get({ key: 'loginState' }).then((res) =>
      JSON.parse(res.value || '{}'),
    );
    if (!localState || !localState.data) {
      this.$router.push('/login');
      return;
    }
    console.log('Loaded local login state:', localState.data);
    console.log('User name:', localState.data.user.name);
    this.homeState.userName = localState.data.user.name || 'Unknown User';
  }

  @Provide()
  async logout() {
    await Preferences.remove({ key: 'loginState' });
    this.$router.push('/login');
  }

  @Provide()
  openDeviceSettings() {
    this.show = true;
  }

  @Provide()
  async applyVideoSettings(settings: any) {
    const videoContainer = this.$refs.videoContainer as any;
    if (videoContainer) {
      // 更新 video-container 的设置
      videoContainer.settings = settings;
      await videoContainer.applySettings();
    }
  }

  showPopup() {
    this.show = true;
  }
}
</script>

<template>
  <div class="home-view">
    <Popup v-model:show="show" position="bottom">
      <template #default>
        <GlobalSettings @close="show = false" />
      </template>
    </Popup>
    <HomeNavBar />
    <div class="home-content">
      <VideoContainer ref="videoContainer" v-if="this.currentPageIndex === 0" />
    </div>
    <footer class="home-footer" v-if="screenOrientation.isPortrait">
      <Tabbar unactive-color="#7d7e80" active-color="#1989fa">
        <TabbarItem label="Home">
          <template #icon="props">
            <Home :stroke-width="1" />
          </template>
        </TabbarItem>
        <TabbarItem label="Settings" @click="showPopup">
          <template #icon="props">
            <Settings :stroke-width="1" />
          </template>
        </TabbarItem>
      </Tabbar>
    </footer>
  </div>
</template>

<style lang="less" scoped>
.home-view {
  width: 100%;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: 2rem;

  .home-content {
    flex: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .home-footer {
    width: 100%;
    flex-shrink: 0;
  }
}
</style>
