import { useEffect, useState, useCallback, useRef } from 'react'
import { useTestStore } from '../store/testStore'
import { Timer as TimerIcon } from 'lucide-react'

interface TimerProps {
  onTimeUp: () => void
}

export default function Timer({ onTimeUp }: TimerProps) {
  const getTimeRemaining = useTestStore((s) => s.getTimeRemaining)
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemaining())
  const calledRef = useRef(false)

  const tick = useCallback(() => {
    const rem = getTimeRemaining()
    setTimeRemaining(rem)
    if (rem === 0 && !calledRef.current) {
      calledRef.current = true
      onTimeUp()
    }
  }, [getTimeRemaining, onTimeUp])

  useEffect(() => {
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tick])

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const isVeryLow = timeRemaining > 0 && timeRemaining <= 60
  const isLow = timeRemaining > 60 && timeRemaining <= 300

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-base select-none transition-colors ${
        isVeryLow
          ? 'bg-red-600 text-white animate-pulse'
          : isLow
            ? 'bg-orange-500 text-white'
            : 'bg-gray-700 text-white'
      }`}
    >
      <TimerIcon size={15} />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}
