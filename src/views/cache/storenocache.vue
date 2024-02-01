<template>
    <BasePage>
        <el-button @click="counter.$state.count++">增加</el-button>
        pinia中存储的当前点击数量：{{ counter.$state.count }}
    </BasePage>
</template>
<script setup lang="ts">
import useCounter from '@/store/useCounter';

const counter = useCounter();
</script>