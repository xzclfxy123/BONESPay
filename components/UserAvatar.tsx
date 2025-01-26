"use client"

import React, { useEffect, useRef } from "react"
import * as jdenticon from "jdenticon"

interface UserAvatarProps {
  address: string
  size?: number
}

export function UserAvatar({ address, size = 64 }: UserAvatarProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current) {
      jdenticon.update(svgRef.current, address)
    }
  }, [address])

  return <svg ref={svgRef} width={size} height={size} data-jdenticon-value={address} className="rounded-full absolute w-48 h-48 z-10" />
}
