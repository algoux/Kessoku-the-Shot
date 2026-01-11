<script lang="ts">
import { Vue, Options } from 'vue-class-component';
import { Form, CellGroup, Field, Button, Icon, Image } from 'vant';
import logo from '@/assets/favicon.png';
import { User, KeyRound, Eye, EyeOff } from 'lucide-vue-next';
import { Preferences } from '@capacitor/preferences';
import { LoginState } from '@/typings/data';

@Options({
  components: {
    Form,
    CellGroup,
    Field,
    Button,
    Icon,
    Image,
    User,
    KeyRound,
    Eye,
    EyeOff,
  },
})
export default class LoginView extends Vue {
  logoUrl = logo;
  passwordVisible = false;
  loginState: LoginState = {
    userId: '',
    token: '',
  };

  get passwordType(): string {
    return this.passwordVisible ? 'text' : 'password';
  }

  get canLogin(): boolean {
    return this.loginState.userId !== '' && this.loginState.token !== '';
  }

  async login() {
    await Preferences.set({
      key: 'loginState',
      value: JSON.stringify(this.loginState),
    });
    this.$router.push('/');
  }
}
</script>

<template>
  <div class="login-container">
    <Image :src="logoUrl" width="100" height="100" fit="contain" />
    <h1 class="login-title">Login to Kessoku the Shot</h1>
    <Form class="login-form" @submit="login">
      <CellGroup inset>
        <Field
          v-model="loginState.userId"
          label="userId"
          placeholder="Enter your User ID"
          clearable
          class="text-input"
          label-align="center"
          size="large"
          label-width="50"
        >
          <template #left-icon>
            <Icon>
              <User :stroke-width="1" size="18" />
            </Icon>
          </template>
        </Field>
        <Field
          v-model="loginState.token"
          :type="passwordType"
          label="token"
          placeholder="Enter your Token"
          label-align="center"
          label-width="50"
          clearable
          class="text-input"
          size="large"
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
        block
        native-type="submit"
        :disabled="!canLogin"
        style="margin-top: 1rem"
        >Login</Button
      >
    </Form>
    <p class="copyright">© 2026 algoUX. All rights reserved.</p>
  </div>
</template>

<style scoped lang="less">
.login-container {
  height: 100dvh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  overflow: hidden;
  position: relative;

  & .login-title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  & .copyright {
    position: absolute;
    bottom: 2rem;
    font-size: 0.6rem;
    color: #888;
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
  width: 70vw;
  max-width: 25rem;
}

.text-input {
  font-size: 1rem;
}
</style>
