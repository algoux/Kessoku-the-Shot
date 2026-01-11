<script lang="ts">
import { Vue, Options } from 'vue-class-component';

@Options({})
export default class VideoContainer extends Vue {
  availableCamera: MediaDeviceInfo;

  async getCameraStream(): Promise<MediaStream | undefined> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      return stream;
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert(`摄像头访问失败: ${error}`);
    }
  }

  async updateVidoElement(stream: MediaStream) {
    const video = document.querySelector('video')!;
    video.srcObject = stream;
    await video.play();
  }

  async mounted() {
    console.log('VideoContainer 组件已挂载');
    const stream = await this.getCameraStream();
    if (stream) {
      this.updateVidoElement(stream);
    }
  }
}
</script>

<template>
  <div class="video-container">
    <video autoplay playsinline muted id="localVideo"></video>
  </div>
</template>

<style scoped lang="less">
.video-container {
  width: 95%;
  aspect-ratio: 16 / 9;
  background-color: black;
  border: 1px solid #ccc;

  & video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
