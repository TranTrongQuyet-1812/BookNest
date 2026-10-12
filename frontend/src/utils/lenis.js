let globalLenis = null;

export const setGlobalLenis = (lenis) => {
  globalLenis = lenis;
};

export const getLenis = () => globalLenis;
