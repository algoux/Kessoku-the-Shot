<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Preferences } from '@capacitor/preferences';
import { HomePageIndexEnum, HomeState } from '@/typings/data';
import { Provide } from 'vue-property-decorator';

// import { Button, Collapse, CollapseItem, Tabbar, TabbarItem, Navbar } from '@nutui/nutui';
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
    show: boolean = false
  @Provide()
  homeState: HomeState = {
    userId: '',
  };
  currentPageIndex: HomePageIndexEnum = HomePageIndexEnum.HOME;

  async mounted() {
    const { userId, token } = await Preferences.get({ key: 'loginState' }).then((res) =>
      JSON.parse(res.value || '{}'),
    );
    if (!userId && !token) this.$router.push('/login');
    else {
      this.homeState.userId = userId;
    }
  }

  @Provide()
  async logout() {
    await Preferences.remove({ key: 'loginState' });
    this.$router.push('/login');
  }

  showPopup() {
    this.show = true;
  }
}
</script>

<template>
  <div class="home-view">
    <Popup v-model:show="show"  position="bottom" >
        <template #default>
            <GlobalSettings />
        </template>
    </Popup>
    <HomeNavBar />
    <div class="home-content">
      <VideoContainer v-if="this.currentPageIndex === 0" />
      <!-- <GlobalSettings v-else-if="this.currentPageIndex === 1" /> -->
    </div>
    <footer class="home-footer">
      <Tabbar unactive-color="#7d7e80" active-color="#1989fa" >
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
    background-color: red;
  }
}
</style>
