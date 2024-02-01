<template>
    <ul>
        <li v-for="i of 6" :key="i" class="itemy enter-y">
            <ol>
                <li v-for="i of 10" :key="i" class="itemx enter-x">
                    {{ i }}
                </li>
            </ol>
        </li>
    </ul>
</template>

<script setup lang="ts">

</script>

<style lang="less" scoped>
ul {
    width: 100%;
}

.itemy {
    width: 100%;
    height: 100px;
    border: @border;
    margin: @gap 0;
}

ol {
    height: 100%;
    display: flex;
    gap: @gap;
    align-items: center;
    justify-content: space-around;
}

.itemx {
    width: 100px;
    line-height: 50px;
    text-align: center;
    height: 50px;
    border: 1px solid red;
}
</style>
