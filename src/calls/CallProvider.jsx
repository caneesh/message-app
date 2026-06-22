import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { setCallContextRef } from '../components/PanicLogoutButton'
import {
  createCall,
  updateCallOffer,
  updateCallAnswer,
  updateCallStatus,
  addIceCandidate,
  subscribeToCall,
  subscribeToIceCandidates,
  subscribeToIncomingCalls,
  checkForActiveCall,
  CALL_STATUS,
  CALL_TIMEOUT_MS,
  CALL_TYPE,
} from './callService'
import {
  createPeerConnection,
  getLocalMedia,
  addLocalTracksToConnection,
  createOffer,
  createAnswer,
  setRemoteAnswer,
  addRemoteIceCandidate,
  stopMediaTracks,
  closePeerConnection,
  toggleAudio,
  toggleVideo,
  switchCamera,
  replaceVideoTrack,
  hasCameraSwitchSupport,
} from './webrtcService'

const CallContext = createContext(null)

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}

export const CALL_STATE = {
  IDLE: 'idle',
  OUTGOING: 'outgoing',
  INCOMING: 'incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
}

export function CallProvider({ children, chatId, currentUser, otherUserId }) {
  const [callState, setCallState] = useState(CALL_STATE.IDLE)
  const [callId, setCallId] = useState(null)
  const [callData, setCallData] = useState(null)
  const [callType, setCallType] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [error, setError] = useState(null)
  const [connectionState, setConnectionState] = useState(null)
  const [callStartTime, setCallStartTime] = useState(null)

  const pcRef = useRef(null)
  const callUnsubRef = useRef(null)
  const candidatesUnsubRef = useRef(null)
  const incomingUnsubRef = useRef(null)
  const timeoutRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const isCallerRef = useRef(false)

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (callUnsubRef.current) {
      callUnsubRef.current()
      callUnsubRef.current = null
    }
    if (candidatesUnsubRef.current) {
      candidatesUnsubRef.current()
      candidatesUnsubRef.current = null
    }
    stopMediaTracks(localStream)
    stopMediaTracks(remoteStream)
    closePeerConnection(pcRef.current)
    pcRef.current = null
    pendingCandidatesRef.current = []
    setLocalStream(null)
    setRemoteStream(null)
    setCallId(null)
    setCallData(null)
    setCallType(null)
    setIsMuted(false)
    setIsVideoOff(false)
    setError(null)
    setConnectionState(null)
    setCallStartTime(null)
    isCallerRef.current = false
  }, [localStream, remoteStream])

  const endCall = useCallback(
    async (status = CALL_STATUS.ENDED) => {
      if (callId && chatId) {
        try {
          await updateCallStatus(chatId, callId, status, currentUser?.uid)
        } catch (err) {
          console.error('Error updating call status:', err)
        }
      }
      cleanup()
      setCallState(CALL_STATE.IDLE)
    },
    [callId, chatId, currentUser?.uid, cleanup]
  )

  const handleConnectionStateChange = useCallback(
    (state) => {
      setConnectionState(state)
      if (state === 'connected') {
        setCallState(CALL_STATE.CONNECTED)
        setCallStartTime(Date.now())
      } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (callState === CALL_STATE.CONNECTED || callState === CALL_STATE.CONNECTING) {
          endCall(CALL_STATUS.FAILED)
        }
      }
    },
    [callState, endCall]
  )

  const setupPeerConnection = useCallback(
    (stream) => {
      const pc = createPeerConnection(
        (candidate) => {
          if (callId && chatId) {
            addIceCandidate(chatId, callId, candidate, isCallerRef.current, currentUser?.uid)
          } else {
            pendingCandidatesRef.current.push(candidate)
          }
        },
        (remStream) => {
          setRemoteStream(remStream)
        },
        handleConnectionStateChange
      )
      addLocalTracksToConnection(pc, stream)
      pcRef.current = pc
      return pc
    },
    [callId, chatId, currentUser?.uid, handleConnectionStateChange]
  )

  const startCall = useCallback(async (type = CALL_TYPE.VIDEO) => {
    if (!chatId || !currentUser?.uid || !otherUserId) {
      setError('Cannot start call: missing chat or user info')
      return
    }

    const activeCall = await checkForActiveCall(chatId)
    if (activeCall) {
      setError('There is already an active call')
      return
    }

    setCallState(CALL_STATE.OUTGOING)
    setCallType(type)
    setError(null)
    isCallerRef.current = true

    const isVideo = type === CALL_TYPE.VIDEO
    const { stream, error: mediaError } = await getLocalMedia(isVideo, true)
    if (mediaError) {
      setError(mediaError)
      setCallState(CALL_STATE.IDLE)
      setCallType(null)
      return
    }
    setLocalStream(stream)

    try {
      const newCallId = await createCall(chatId, currentUser.uid, otherUserId, type)
      setCallId(newCallId)

      const pc = setupPeerConnection(stream)

      for (const candidate of pendingCandidatesRef.current) {
        addIceCandidate(chatId, newCallId, candidate, true, currentUser.uid)
      }
      pendingCandidatesRef.current = []

      const offer = await createOffer(pc)
      await updateCallOffer(chatId, newCallId, offer)

      callUnsubRef.current = subscribeToCall(chatId, newCallId, async (data) => {
        setCallData(data)
        if (data?.status === CALL_STATUS.ACCEPTED && data.answer && pcRef.current) {
          try {
            await setRemoteAnswer(pcRef.current, data.answer)
            setCallState(CALL_STATE.CONNECTING)
          } catch (err) {
            console.error('Error setting remote answer:', err)
          }
        } else if (data?.status === CALL_STATUS.REJECTED) {
          cleanup()
          setCallState(CALL_STATE.ENDED)
          setTimeout(() => setCallState(CALL_STATE.IDLE), 2000)
        } else if (data?.status === CALL_STATUS.ENDED || data?.status === CALL_STATUS.MISSED) {
          cleanup()
          setCallState(CALL_STATE.ENDED)
          setTimeout(() => setCallState(CALL_STATE.IDLE), 2000)
        }
      })

      candidatesUnsubRef.current = subscribeToIceCandidates(chatId, newCallId, true, async (candidateData) => {
        if (pcRef.current) {
          try {
            await addRemoteIceCandidate(pcRef.current, candidateData)
          } catch (err) {
            console.error('Error adding remote ICE candidate:', err)
          }
        }
      })

      timeoutRef.current = setTimeout(async () => {
        if (callState === CALL_STATE.OUTGOING) {
          await updateCallStatus(chatId, newCallId, CALL_STATUS.MISSED, currentUser.uid)
          cleanup()
          setCallState(CALL_STATE.ENDED)
          setTimeout(() => setCallState(CALL_STATE.IDLE), 2000)
        }
      }, CALL_TIMEOUT_MS)
    } catch (err) {
      console.error('Error starting call:', err)
      setError('Failed to start call')
      cleanup()
      setCallState(CALL_STATE.IDLE)
    }
  }, [chatId, currentUser?.uid, otherUserId, setupPeerConnection, cleanup, callState])

  const acceptCall = useCallback(async () => {
    if (!callData || !chatId) return

    const type = callData.type || CALL_TYPE.VIDEO
    setCallState(CALL_STATE.CONNECTING)
    setCallType(type)
    setError(null)
    isCallerRef.current = false

    const isVideo = type === CALL_TYPE.VIDEO
    const { stream, error: mediaError } = await getLocalMedia(isVideo, true)
    if (mediaError) {
      setError(mediaError)
      await updateCallStatus(chatId, callData.id, CALL_STATUS.FAILED)
      cleanup()
      setCallState(CALL_STATE.IDLE)
      return
    }
    setLocalStream(stream)

    try {
      const pc = setupPeerConnection(stream)

      const answer = await createAnswer(pc, callData.offer)
      await updateCallAnswer(chatId, callData.id, answer)

      for (const candidate of pendingCandidatesRef.current) {
        addIceCandidate(chatId, callData.id, candidate, false, currentUser?.uid)
      }
      pendingCandidatesRef.current = []

      candidatesUnsubRef.current = subscribeToIceCandidates(chatId, callData.id, false, async (candidateData) => {
        if (pcRef.current) {
          try {
            await addRemoteIceCandidate(pcRef.current, candidateData)
          } catch (err) {
            console.error('Error adding remote ICE candidate:', err)
          }
        }
      })
    } catch (err) {
      console.error('Error accepting call:', err)
      setError('Failed to accept call')
      await updateCallStatus(chatId, callData.id, CALL_STATUS.FAILED)
      cleanup()
      setCallState(CALL_STATE.IDLE)
    }
  }, [callData, chatId, currentUser?.uid, setupPeerConnection, cleanup])

  const rejectCall = useCallback(async () => {
    if (!callData || !chatId) return
    await updateCallStatus(chatId, callData.id, CALL_STATUS.REJECTED, currentUser?.uid)
    cleanup()
    setCallState(CALL_STATE.IDLE)
  }, [callData, chatId, currentUser?.uid, cleanup])

  const toggleMute = useCallback(() => {
    if (localStream) {
      toggleAudio(localStream, isMuted)
      setIsMuted(!isMuted)
    }
  }, [localStream, isMuted])

  const toggleCamera = useCallback(() => {
    if (localStream) {
      toggleVideo(localStream, isVideoOff)
      setIsVideoOff(!isVideoOff)
    }
  }, [localStream, isVideoOff])

  const switchCameraFacing = useCallback(async () => {
    if (!localStream || !pcRef.current) return

    const newTrack = await switchCamera(localStream)
    if (newTrack) {
      await replaceVideoTrack(pcRef.current, localStream, newTrack)
    }
  }, [localStream])

  useEffect(() => {
    if (!chatId || !currentUser?.uid) return

    incomingUnsubRef.current = subscribeToIncomingCalls(chatId, currentUser.uid, (incomingCall) => {
      if (incomingCall && callState === CALL_STATE.IDLE) {
        setCallId(incomingCall.id)
        setCallData(incomingCall)
        setCallType(incomingCall.type || CALL_TYPE.VIDEO)
        setCallState(CALL_STATE.INCOMING)

        callUnsubRef.current = subscribeToCall(chatId, incomingCall.id, (data) => {
          setCallData(data)
          if (data?.status === CALL_STATUS.ENDED || data?.status === CALL_STATUS.MISSED) {
            cleanup()
            setCallState(CALL_STATE.IDLE)
          }
        })
      }
    })

    return () => {
      if (incomingUnsubRef.current) {
        incomingUnsubRef.current()
      }
    }
  }, [chatId, currentUser?.uid, callState, cleanup])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (callState !== CALL_STATE.IDLE) {
        if (callId && chatId) {
          navigator.sendBeacon?.(
            `/__end_call__?chatId=${chatId}&callId=${callId}&status=${CALL_STATUS.ENDED}`
          )
        }
        stopMediaTracks(localStream)
        closePeerConnection(pcRef.current)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [callState, callId, chatId, localStream])

  useEffect(() => {
    return () => {
      cleanup()
      if (incomingUnsubRef.current) {
        incomingUnsubRef.current()
      }
    }
  }, [cleanup])

  const startVideoCall = useCallback(() => startCall(CALL_TYPE.VIDEO), [startCall])
  const startVoiceCall = useCallback(() => startCall(CALL_TYPE.VOICE), [startCall])

  const isVideoCall = callType === CALL_TYPE.VIDEO
  const isVoiceCall = callType === CALL_TYPE.VOICE

  const value = useMemo(
    () => ({
      callState,
      callData,
      callType,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      error,
      connectionState,
      callStartTime,
      isVideoCall,
      isVoiceCall,
      startCall,
      startVideoCall,
      startVoiceCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      switchCameraFacing,
      canSwitchCamera: hasCameraSwitchSupport(),
      CALL_TYPE,
    }),
    [
      callState,
      callData,
      callType,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      error,
      connectionState,
      callStartTime,
      isVideoCall,
      isVoiceCall,
      startCall,
      startVideoCall,
      startVoiceCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleCamera,
      switchCameraFacing,
    ]
  )

  useEffect(() => {
    setCallContextRef(value)
    return () => setCallContextRef(null)
  }, [value])

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}
