const DEFAULT_STUN_URLS = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']

function getIceServers() {
  const servers = []

  const stunUrls = import.meta.env.VITE_WEBRTC_STUN_URLS
  if (stunUrls) {
    servers.push({ urls: stunUrls.split(',').map((u) => u.trim()) })
  } else {
    servers.push({ urls: DEFAULT_STUN_URLS })
  }

  const turnUrl = import.meta.env.VITE_WEBRTC_TURN_URL
  const turnUsername = import.meta.env.VITE_WEBRTC_TURN_USERNAME
  const turnCredential = import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL
  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    })
  }

  return servers
}

export function createPeerConnection(onIceCandidate, onTrack, onConnectionStateChange) {
  const config = {
    iceServers: getIceServers(),
    iceCandidatePoolSize: 10,
  }

  console.log('[WebRTC] Creating peer connection with config:', config)
  const pc = new RTCPeerConnection(config)

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[WebRTC] ICE candidate generated')
      onIceCandidate(event.candidate)
    }
  }

  pc.ontrack = (event) => {
    console.log('[WebRTC] Remote track received:', event.track.kind, 'streams:', event.streams.length)
    if (event.streams[0]) {
      console.log('[WebRTC] Remote stream tracks:', event.streams[0].getTracks().map(t => t.kind))
    }
    onTrack(event.streams[0])
  }

  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', pc.connectionState)
    onConnectionStateChange(pc.connectionState)
  }

  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE connection state:', pc.iceConnectionState)
    if (pc.iceConnectionState === 'failed') {
      onConnectionStateChange('failed')
    }
  }

  return pc
}

export async function getLocalMedia(videoEnabled = true, audioEnabled = true) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoEnabled
        ? {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : false,
      audio: audioEnabled,
    })
    return { stream, error: null }
  } catch (err) {
    const isVoiceOnly = !videoEnabled && audioEnabled
    let errorMessage = isVoiceOnly
      ? 'Failed to access microphone'
      : 'Failed to access camera or microphone'

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage = isVoiceOnly
        ? 'Microphone permission is needed for voice calls.'
        : 'Camera or microphone permission is needed for video calls.'
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMessage = isVoiceOnly
        ? 'No microphone found on this device.'
        : 'No camera or microphone found on this device.'
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorMessage = isVoiceOnly
        ? 'Microphone is already in use by another app.'
        : 'Camera or microphone is already in use by another app.'
    }
    return { stream: null, error: errorMessage }
  }
}

export function addLocalTracksToConnection(pc, localStream) {
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream)
  })
}

export async function createOffer(pc) {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  return {
    type: offer.type,
    sdp: offer.sdp,
  }
}

export async function createAnswer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer))
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  return {
    type: answer.type,
    sdp: answer.sdp,
  }
}

export async function setRemoteAnswer(pc, answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer))
}

export async function addRemoteIceCandidate(pc, candidateData, pendingCandidatesQueue) {
  const candidate = new RTCIceCandidate({
    candidate: candidateData.candidate,
    sdpMid: candidateData.sdpMid,
    sdpMLineIndex: candidateData.sdpMLineIndex,
  })

  if (pc.remoteDescription && pc.remoteDescription.type) {
    await pc.addIceCandidate(candidate)
  } else if (pendingCandidatesQueue) {
    pendingCandidatesQueue.push(candidate)
  }
}

export async function flushPendingCandidates(pc, pendingCandidatesQueue) {
  if (!pc || !pendingCandidatesQueue || pendingCandidatesQueue.length === 0) return

  while (pendingCandidatesQueue.length > 0) {
    const candidate = pendingCandidatesQueue.shift()
    try {
      await pc.addIceCandidate(candidate)
    } catch (err) {
      console.error('Error adding queued ICE candidate:', err)
    }
  }
}

export function stopMediaTracks(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }
}

export function closePeerConnection(pc) {
  if (pc) {
    pc.close()
  }
}

export function toggleAudio(stream, enabled) {
  if (stream) {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }
}

export function toggleVideo(stream, enabled) {
  if (stream) {
    stream.getVideoTracks().forEach((track) => {
      track.enabled = enabled
    })
  }
}

export async function switchCamera(stream) {
  if (!stream) return null

  const videoTrack = stream.getVideoTracks()[0]
  if (!videoTrack) return null

  const currentSettings = videoTrack.getSettings()
  const currentFacingMode = currentSettings.facingMode

  const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'

  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: newFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
    return newStream.getVideoTracks()[0]
  } catch (err) {
    console.error('Failed to switch camera:', err)
    return null
  }
}

export async function replaceVideoTrack(pc, oldStream, newTrack) {
  if (!pc || !oldStream || !newTrack) return

  const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
  if (sender) {
    await sender.replaceTrack(newTrack)
  }

  const oldVideoTrack = oldStream.getVideoTracks()[0]
  if (oldVideoTrack) {
    oldStream.removeTrack(oldVideoTrack)
    oldVideoTrack.stop()
  }
  oldStream.addTrack(newTrack)
}

export function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export function hasCameraSwitchSupport() {
  return isMobileDevice() && navigator.mediaDevices?.enumerateDevices
}
