<script setup lang="ts">
</script>

<template>
  <nav class="hidden justify-between items-center p-5 gap-5 font-serif text-theme-navText border-t border-solid border-theme-navDivider bg-theme-nav fixed bottom-0 left-0 right-0 z-10 md:flex md:static">
    <routerLink to="/" class="flex flex-wrap justify-center" title="Accueil">
      <LucideHeartPulse :size="30" class="fill-rust stroke-white" />
      <span class="text-xs md:hidden">
        Home
      </span>
    </routerLink>

    <p class="text-xs text-center md:text md:flex md:items-center">
       <span class="mt-1">&copy;</span>
       2026 - Attachement Questionnaire. Tous droits réservés.
    </p>
    
    <div class="flex justify-between gap-5">
      <RouterLink to="/attachement-styles" class="flex flex-wrap justify-center">
        <LucideList :size="20" class="mb-3 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-xs hidden md:block md:text-md">
          Attachement styles
        </span>
      </RouterLink>
      <routerLink to="/glossaire" class="flex flex-wrap justify-center">
        <LucideBookText :size="20" class="mb-3 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-xs md:text-md">
          Glossaire
        </span>
      </routerLink>
      <RouterLink to="/elements" class="flex flex-wrap justify-center">
        <LucideBarChart2 :size="20" class="mb-3 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-xs md:text-md">
          Elements
        </span>
      </RouterLink>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.router-link-active {
  font-weight: bold;
  color: var(--nav-active);
  position: relative;

  &:after {
    content: '';
    display: block;
    width: 100%;
    height: 2px;
    margin-top: 3px;
    position: absolute;
    top: 100%;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--nav-active);
    margin-top: 4px;
  }
}
</style>
