<template>
    <BasePage>
        <el-button @click="count++">增加</el-button>
        当前点击数量：{{ count }}
    </BasePage>
</template>
<script setup lang="ts">
import BasePage from '@/components/basePage.vue';
import { ref } from 'vue';

const count = ref(0);
</script>