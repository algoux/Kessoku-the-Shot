<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Inject } from 'vue-property-decorator';
import { LoginState, ScreenOrientationState } from '@/typings/data';

import { Form, CellGroup, Field, Button, Icon, Image, showNotify } from 'vant';
import { User, KeyRound, Eye, EyeOff, Target } from 'lucide-vue-next';
import logo from '@/assets/favicon.png';

@Options({
  components: {
    Form,
    CellGroup,
    Field,
    Button,
    Icon,
    Image,
    showNotify,
    User,
    KeyRound,
    Target,
    Eye,
    EyeOff,
  },
})
export default class LoginView extends Vue {
  @Inject() loading!: boolean;
  logoUrl = logo;
  passwordVisible = false;
  loginState: LoginState = {
    shotToken: '',
    alias: '',
    shotName: '',
  };

  @Inject() screenOrientation!: ScreenOrientationState;
  @Inject() login: (alias: string, shotName: string, token: string) => Promise<void>;

  get passwordType(): string {
    return this.passwordVisible ? 'text' : 'password';
  }

  get canLogin(): boolean {
    return this.loginState.alias !== '' && this.loginState.shotToken !== '';
  }

  async handleLogin() {
    await this.login(this.loginState.alias, this.loginState.shotName, this.loginState.shotToken);
  }
}
</script>

<template>
  <div class="login-container" :class="screenOrientation.isPortrait ? 'shu' : 'heng'">
    <Image :src="logoUrl" width="100" height="100" fit="contain" />
    <h1 class="login-title">Login to Kessoku the Shot</h1>
    <Form class="login-form" @submit="handleLogin">
      <CellGroup inset>
        <Field
          v-model="loginState.alias"
          label="alias"
          placeholder="contest alias"
          clearable
          class="text-input"
          label-align="center"
          size="small"
          label-width="45"
        >
          <template #left-icon>
            <Icon>
              <Target :stroke-width="1" size="18" />
            </Icon>
          </template>
        </Field>
        <Field
          v-model="loginState.shotName"
          label="name"
          placeholder="unique shot name"
          clearable
          class="text-input"
          label-align="center"
          size="small"
          label-width="45"
        >
          <template #left-icon>
            <Icon>
              <User :stroke-width="1" size="18" />
            </Icon>
          </template>
        </Field>
        <Field
          v-model="loginState.shotToken"
          :type="passwordType"
          label="token"
          placeholder="shot token"
          label-align="center"
          label-width="45"
          clearable
          class="text-input"
          size="small"
        >
          <template #left-icon>
            <Icon>
              <KeyRound :stroke-width="1" size="18" />
            </Icon>
          </template>
          <template #right-icon>
            <Button
              class="visible-button"
              @click="passwordVisible = !passwordVisible"
              icon
              plain
              block
            >
              <Eye :stroke-width="1" v-if="passwordVisible" size="18" />
              <EyeOff :stroke-width="1" v-else size="18" />
            </Button>
          </template>
        </Field>
      </CellGroup>
      <Button
        round
        type="primary"
        size="small"
        block
        native-type="submit"
        :disabled="!canLogin"
        style="margin-top: 1rem"
        :loading="loading"
        loading-text="Logging in..."
        >Login</Button
      >
    </Form>
    <p class="copyright" v-if="screenOrientation.isPortrait">© 2026 algoUX. All rights reserved.</p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-badge__wrapper, .van-icon, .van-icon-undefined) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.van-field__left-icon) {
  display: flex;
  justify-content: center;
  align-content: center;
}
.login-container {
  height: 100dvh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;

  & .login-title {
    font-size: var(--title-font-size);
    font-weight: bold;
  }

  & .copyright {
    position: absolute;
    font-size: var(--desc-font-size);
    color: #888;
  }
}

.shu {
  gap: 1.5rem;
  & .copyright {
    bottom: 1rem;
  }
}

.heng {
  gap: 1rem;
  & .copyright {
    bottom: 0.5rem;
  }
}

.visible-button {
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  height: fit-content;
  align-items: center;
  border: none;
}

.login-form {
  width: 72vw;
  max-width: 20rem;
}

.text-input {
  font-size: var(--text-font-size);
}
</style>
