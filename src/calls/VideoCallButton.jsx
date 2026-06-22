import { useCall, CALL_STATE } from './CallProvider'

function VideoCallButton() {
  const { callState, startCall } = useCall()

  const isDisabled = callState !== CALL_STATE.IDLE

  return (
    <button
      className="video-call-btn"
      onClick={startCall}
      disabled={isDisabled}
      title="Video call"
      aria-label="Start video call"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    </button>
  )
}

export default VideoCallButton
