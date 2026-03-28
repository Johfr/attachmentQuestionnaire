<script setup lang="ts">
</script>

<template>
  <nav class="flex justify-between items-center p-5 gap-5 font-serif text-gray-500 border-b border-solid border-gray-300 bg-lightPeach fixed bottom-0 left-0 right-0 z-10 md:static">
    <routerLink to="/" class="flex flex-wrap justify-center">
      <LucideHeartPulse :size="30" class="fill-rust stroke-white" />
      <span class="text-xs md:hidden">
        Home
      </span>
    </routerLink>
    
    <div class="flex justify-between gap-5">
      <RouterLink to="/questionnaires" class="flex flex-wrap justify-center">
        <LucideList :size="20" class="mb-3 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-xs md:hidden">
          Tests
        </span>
        <span class="text-xs hidden md:block md:text-md">
          Questionnaires
        </span>
      </RouterLink>
      <routerLink to="/blog" class="flex flex-wrap justify-center">
        <LucideBookText :size="20" class="mb-3 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-xs md:text-md">
          Blog
        </span>
      </routerLink>
      <RouterLink to="/attachment-questionnaire/results" class="flex flex-wrap justify-center">
        <LucideBarChart2 :size="20" class="mb-3 md:mr-1 text-rust md:hidden md:mb-0" />
        <span class="text-xs md:text-md">
          Formation
        </span>
      </RouterLink>
    </div>

    <!-- User -->
    <div>
      <RouterLink to="/user/profil" class="flex flex-wrap justify-center">
        <LucideUser :size="20" class="mb-3 md:mr-1 md:mb-0 fill-rust stroke-rust" />
        <span class="text-xs md:hidden">
          Profil
        </span>
      </RouterLink>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.router-link-active {
  font-weight: bold;
  color: #b5651d; /* Rust color */
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
    background-color: #b5651d; /* Rust color */
    margin-top: 4px;
  }
}
</style>