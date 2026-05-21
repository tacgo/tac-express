"use client"

import * as React from "react"
import Lottie from "lottie-react"

interface LottieHeroProps {
  animationData: object
  className?: string
}

export function LottieHero({ animationData, className }: LottieHeroProps) {
  return (
    <div className={className} data-slot="lottie-hero">
      <Lottie 
        animationData={animationData} 
        loop={true} 
        autoplay={true}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  )
}
