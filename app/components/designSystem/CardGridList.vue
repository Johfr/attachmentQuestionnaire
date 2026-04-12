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

const backgroundTokenMap: Record<string, string> = {
  rust: 'var(--surface-link-card)',
  softGreen: 'var(--surface-link-card)',
  softPeach: 'var(--surface-link-card)',
  white: 'var(--surface-link-card)',
}

const getItemSurfaceStyle = (item: typeof props.items[number], itemId: number) => {
  const backgroundValue = itemsBackground.value?.[itemId]
  const backgroundColor = backgroundValue
    ? backgroundTokenMap[backgroundValue] || backgroundValue
    : 'var(--surface-link-card)'

  return {
    backgroundColor,
    ...(item.image ? { backgroundImage: `url(${item.image})` } : {}),
  }
}
</script>

<template>
  <ul class="flex justify-center items-start flex-wrap gap-1 gap-y-2 md:justify-start md:items-stretch">
    <li
      v-for="(item, itemId) in items" :key="item.id"
      class="relative mb-3 last:mb-0 overflow-hidden rounded-3xl bg-theme-surfaceLinkCard shadow-lg transition-all duration-500 md:mb-0 md:shadow-none md:hover:z-10 md:hover:scale-[1.01] md:hover:shadow-lg"
      :class="[
        // !isBlog && itemId === 0 ? 'md:max-w-[59%]' : '',
        // !isBlog && itemId === 1 ? 'md:max-w-[40%]' : '',
        // !isBlog && itemId > 1 ? 'md:max-w-[33%]' : '',
        !isBlog ? 'md:max-w-[49%]' : 'md:max-w-[33%] bg-theme-surfaceLinkCard',
        { 'opacity-70 pointer-events-none cursor-not-allowed': !item.isActive },
      ]"
      :style="getItemSurfaceStyle(item, itemId)"
    >
      <NuxtLink
        :to="item.link"
        class="p-4"
        :class="{ 'pointer-events-none cursor-not-allowed': !item.isActive,}"
      >
        <section
          :class="[
            'flex flex-col justify-start',
            {'pt-16 pb-4' : !isBlog },
            !isBlog ? 'pt-16 pb-4' : 'py-5'
          ]"
        >
          <h2 class="flex items-start text-lg font-bold mb-4 text-theme-text">
            <span v-if="asItemIcons">
              <component
                v-if="item.isActive"
                :is="getQuestionnaireIcon(item.icon)"
                :size="40"
                class="inline-block min-w-10 mr-2 p-2 rounded-full bg-green-200 text-theme-button"
              />
              <LucideLockKeyhole v-else :size="50" class="inline-block p-3 bg-theme-cardMuted mr-2 text-theme-primary rounded-xl" />
            </span>
            {{ item.title }}
          </h2>

          <p
            :class="[
              'text-xs text-theme-muted md:block md:text-sm line-clamp-3',
              !isBlog && itemId <= 1 ? 'md:max-w-[66%] mb-10' : 'mb-5',
              { 'opacity-50 pointer-events-none cursor-not-allowed': !item.isActive }
            ]"
          >
            {{ item.description }}
          </p>
          
          <div class="flex items-center justify-between gap-5 md:flex-row-reverse md:justify-end">
            <p class="subtitle text-xs md:text-sm text-theme-muted">
              <LucideClock5 :size="12" class="mr-1 inline-block" />
              {{ item.duration }}
            </p>

            <p v-if="!item.isActive" class="text-sm text-theme-muted mb-2">Bientôt disponible</p>
            <button
              v-else
              class="py-3"
              :class="[
                buttonType === 'link' ? 'text-theme-link text-sm' : 'px-4 rounded-3xl bg-theme-button text-theme-buttonText text-xs md:text-sm'
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
    background-blend-mode: multiply;
    /* a6472e */
  }
</style>
