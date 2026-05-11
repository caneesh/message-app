import { useState, useEffect } from 'react'
import type { Variants, Transition } from 'framer-motion'

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [])

  return prefersReducedMotion
}

// Instant variants for reduced motion
const instantTransition: Transition = { duration: 0 }

export const instantVariants: Variants = {
  initial: { opacity: 1 },
  enter: { opacity: 1, transition: instantTransition },
  exit: { opacity: 0, transition: instantTransition },
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: instantTransition },
}

export function useAnimationConfig() {
  const reducedMotion = useReducedMotion()

  return {
    reducedMotion,
    transition: reducedMotion ? instantTransition : undefined,
    getVariants: <T extends Variants>(variants: T): T | typeof instantVariants => {
      return reducedMotion ? instantVariants : variants
    },
  }
}

export function useConditionalAnimation<T extends Variants>(
  variants: T,
  condition = true
): T | typeof instantVariants {
  const { reducedMotion } = useAnimationConfig()

  if (reducedMotion || !condition) {
    return instantVariants
  }

  return variants
}
