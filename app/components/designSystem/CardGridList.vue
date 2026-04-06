<script setup lang="ts">
import { resolveComponent, toRefs, type Component } from 'vue'

const props = defineProps<{
  items: {
    id: number
    icon: string
    title: string
    description: string
    image: string
    link: string
    duration: string
    isActive: boolean
  }[],
  isBlog?: boolean,
  itemsBackground?: string[], // tailwind color names or hex codes
  asItemIcons?: boolean,
  itemIcons?: Record<string, Component>,
  buttonText?: string,
  buttonType?: 'button' | 'link',
}>()

const fallbackTagIcon = resolveComponent('LucideCircleHelp') as Component

const getQuestionnaireIcon = (profileKey: string) => props.itemIcons?.[profileKey] || fallbackTagIcon

const { items, itemsBackground } = toRefs(props)
</script>

<template>
  <ul class="flex justify-center items-start flex-wrap gap-1 gap-y-2 md:justify-start md:items-stretch">
    <li
      v-for="(item, itemId) in items" :key="item.id"
      class="rounded-3xl shadow-lg mb-3 last:mb-0 bg-white transition-all duration-500 md:mb-0 md:shadow-none md:border md:hover:shadow-lg md:hover:scale-[1.01] md:hover:z-10 relative overflow-hidden"
      :class="[
        `bg-${itemsBackground?.[itemId]}`,
        // !isBlog && itemId === 0 ? 'md:max-w-[59%]' : '',
        // !isBlog && itemId === 1 ? 'md:max-w-[40%]' : '',
        // !isBlog && itemId > 1 ? 'md:max-w-[33%]' : '',
        !isBlog ? 'md:max-w-[49%]' : 'md:max-w-[33%] bg-white',
        { 'opacity-50 pointer-events-none cursor-not-allowed': !item.isActive },
      ]"
      :style="item.image ? { backgroundImage: `url(${item.image})` } : {}"
    >
      <NuxtLink
        :to="item.link"
        class="p-4"
        :class="{ 'opacity-50 pointer-events-none cursor-not-allowed': !item.isActive,}"
      >
        <section
          :class="[
            'flex flex-col justify-start',
            {'pt-16 pb-4' : !isBlog },
            !isBlog ? 'pt-16 pb-4' : 'py-5'
          ]"
        >
          <h2 class="flex items-start text-lg font-bold mb-4">
            <span v-if="asItemIcons">
              <component
                v-if="item.isActive"
                :is="getQuestionnaireIcon(item.icon)"
                :size="40"
                class="inline-block min-w-10 mr-2 p-2 rounded-full bg-green-200 text-brown"
              />
              <LucideLockKeyhole v-else :size="50" class="inline-block p-3 bg-red-300 mr-2 text-blue-700 rounded-xl" />
            </span>
            {{ item.title }}
          </h2>

          <p
            :class="[
              'text-xs text-gray-600 md:block md:text-sm line-clamp-3',
              !isBlog && itemId <= 1 ? 'md:max-w-[66%] mb-10' : 'mb-5',
              { 'opacity-50 pointer-events-none cursor-not-allowed': !item.isActive }
            ]"
          >
            {{ item.description }}
          </p>
          
          <div class="flex items-center justify-between gap-5 md:flex-row-reverse md:justify-end">
            <p class="subtitle text-xs md:text-sm  text-gray-500">
              <LucideClock5 :size="12" class="mr-1 inline-block" />
              {{ item.duration }}
            </p>

            <p v-if="!item.isActive" class="text-sm text-gray-400 mb-2">Bientôt disponible</p>
            <button
              v-else
              class="py-3"
              :class="[
                buttonType === 'link' ? 'text-brown text-sm' : 'px-4 rounded-3xl bg-brown text-gray-300 text-xs md:text-sm'
              ]"
            >
              {{ props.buttonText || 'Démarrer le questionnaire' }}
              <LucideMoveRight v-if="buttonType === 'link'" :size="16" class="ml-2 inline-block" />
            </button>
          </div>
        </section>
      </NuxtLink>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
  li {
    // background-color: #fdf1ec;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: bottom;
    /* a6472e */
  }
</style>
