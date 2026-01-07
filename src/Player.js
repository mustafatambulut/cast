/* global cast */
import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-contrib-eme';
import Branding from './Branding';

// Detailed logging helper functions for Player
const logPlayer = (category, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [PLAYER:${category}]`;
  if (data !== null && data !== undefined) {
    console.log(`${logPrefix} ${message}`, data);
  } else {
    console.log(`${logPrefix} ${message}`);
  }
};

const logVideoJSEvent = (eventName, player) => {
  logPlayer('VJS_EVENT', `========== ${eventName} ==========`);
  if (player) {
    logPlayer('VJS_EVENT', 'Current Time:', player.currentTime?.());
    logPlayer('VJS_EVENT', 'Duration:', player.duration?.());
    logPlayer('VJS_EVENT', 'Paused:', player.paused?.());
    logPlayer('VJS_EVENT', 'Ready State:', player.readyState?.());
    logPlayer('VJS_EVENT', 'Network State:', player.networkState?.());
    logPlayer('VJS_EVENT', 'Buffered:', player.buffered?.()?.length > 0 ? {
      start: player.buffered().start(0),
      end: player.buffered().end(0)
    } : 'No buffer');
    logPlayer('VJS_EVENT', 'Volume:', player.volume?.());
    logPlayer('VJS_EVENT', 'Muted:', player.muted?.());
  }
  logPlayer('VJS_EVENT', `========== END ${eventName} ==========`);
};

const logLoadRequest = (loadRequestData) => {
  logPlayer('LOAD_REQUEST', '========== LOAD REQUEST FROM MOBILE ==========');
  logPlayer('LOAD_REQUEST', 'Request ID:', loadRequestData?.requestId);
  logPlayer('LOAD_REQUEST', 'Session ID:', loadRequestData?.sessionId);
  logPlayer('LOAD_REQUEST', 'Media Info:', {
    contentId: loadRequestData?.media?.contentId,
    contentUrl: loadRequestData?.media?.contentUrl,
    contentType: loadRequestData?.media?.contentType,
    streamType: loadRequestData?.media?.streamType,
    duration: loadRequestData?.media?.duration,
    metadata: loadRequestData?.media?.metadata
  });
  logPlayer('LOAD_REQUEST', 'Custom Data:', loadRequestData?.media?.customData);
  logPlayer('LOAD_REQUEST', 'Autoplay:', loadRequestData?.autoplay);
  logPlayer('LOAD_REQUEST', 'Current Time:', loadRequestData?.currentTime);
  logPlayer('LOAD_REQUEST', 'Active Track IDs:', loadRequestData?.activeTrackIds);
  logPlayer('LOAD_REQUEST', 'Full Request Data:', JSON.stringify(loadRequestData, null, 2));
  logPlayer('LOAD_REQUEST', '========== END LOAD REQUEST ==========');
};

const logDRMInfo = (customData) => {
  logPlayer('DRM', '========== DRM CONFIGURATION ==========');
  logPlayer('DRM', 'License Server URL:', customData?.licenseServerURL);
  logPlayer('DRM', 'Media ID:', customData?.mediaId);
  logPlayer('DRM', 'DRM Ticket Present:', !!customData?.drmTicket);
  logPlayer('DRM', 'DRM Ticket Length:', customData?.drmTicket?.length || 0);
  logPlayer('DRM', '========== END DRM CONFIGURATION ==========');
};

const Player = ({ userData }) => {
  logPlayer('INIT', 'Player component rendered');
  logPlayer('INIT', 'Received userData:', userData);
  const contextRef = useRef(null);
  if (!contextRef.current) {
    contextRef.current = cast.framework.CastReceiverContext.getInstance();
  }
  const context = contextRef.current;
  const playerManager = context.getPlayerManager();
  const videoNode = useRef(null);
  const player = useRef(null);
  const [showBranding, setShowBranding] = useState(true);
  const [castingData, setCastingData] = useState({});
 

  useEffect(() => {
     const style = document.createElement('style');
     style.textContent = `
       .video-js .vjs-control-bar {
         display: none !important;
       }
       .video-js .vjs-progress-control {
         display: none !important;
       }
       .video-js .vjs-remaining-time {
         display: none !important;
       }
     `;
     document.head.appendChild(style);
    if (player.current) return;

    if (videoNode.current && !player.current) {
      playerManager.setMediaElement(videoNode.current);
    }


    logPlayer('VJS', 'Creating VideoJS player instance...');
    const vjsPlayer = videojs(videoNode.current, {
      controls: false,
      autoplay: false,
      preload: 'auto',
      techOrder: ['html5'],
      html5: {
        vhs: {
          withCredentials: true,
          overrideNative: true,
        },
      },
      loadingSpinner: false,
    });
    logPlayer('VJS', 'VideoJS player instance created');

    // Comprehensive VideoJS event logging
    vjsPlayer.on('playing', () => {
      logVideoJSEvent('PLAYING', vjsPlayer);
      logPlayer('VJS', '▶️ Video playing event fired - Current showBranding state:', showBranding);
      setShowBranding(false);
      logPlayer('VJS', 'showBranding set to false');
    });

    vjsPlayer.on('loadstart', () => {
      logVideoJSEvent('LOADSTART', vjsPlayer);
      logPlayer('VJS', '📥 Video loading started - showing branding overlay');
      setShowBranding(true);
    });
    
    vjsPlayer.on('loadedmetadata', () => {
      logVideoJSEvent('LOADEDMETADATA', vjsPlayer);
      logPlayer('VJS', '📋 Metadata loaded:', {
        duration: vjsPlayer.duration(),
        videoWidth: vjsPlayer.videoWidth(),
        videoHeight: vjsPlayer.videoHeight()
      });
    });
    
    vjsPlayer.on('loadeddata', () => {
      logVideoJSEvent('LOADEDDATA', vjsPlayer);
      logPlayer('VJS', '📦 Data loaded');
    });
    
    vjsPlayer.on('canplay', () => {
      logVideoJSEvent('CANPLAY', vjsPlayer);
      logPlayer('VJS', '✅ Can start playing');
    });
    
    vjsPlayer.on('canplaythrough', () => {
      logVideoJSEvent('CANPLAYTHROUGH', vjsPlayer);
      logPlayer('VJS', '✅ Can play through without buffering');
    });
    
    vjsPlayer.on('waiting', () => {
      logVideoJSEvent('WAITING', vjsPlayer);
      logPlayer('VJS', '⏳ Waiting for data...');
    });
    
    vjsPlayer.on('pause', () => {
      logVideoJSEvent('PAUSE', vjsPlayer);
      logPlayer('VJS', '⏸️ Video paused');
    });
    
    vjsPlayer.on('ended', () => {
      logVideoJSEvent('ENDED', vjsPlayer);
      logPlayer('VJS', '⏹️ Video ended');
    });
    
    vjsPlayer.on('error', (error) => {
      logVideoJSEvent('ERROR', vjsPlayer);
      logPlayer('ERROR', '🔴 VideoJS error:', vjsPlayer.error());
    });
    
    vjsPlayer.on('stalled', () => {
      logVideoJSEvent('STALLED', vjsPlayer);
      logPlayer('VJS', '⚠️ Playback stalled');
    });
    
    vjsPlayer.on('suspend', () => {
      logVideoJSEvent('SUSPEND', vjsPlayer);
      logPlayer('VJS', '💤 Loading suspended');
    });
    
    vjsPlayer.on('abort', () => {
      logVideoJSEvent('ABORT', vjsPlayer);
      logPlayer('VJS', '❌ Loading aborted');
    });
    
    vjsPlayer.on('emptied', () => {
      logVideoJSEvent('EMPTIED', vjsPlayer);
      logPlayer('VJS', '🗑️ Media emptied');
    });
    
    vjsPlayer.on('seeking', () => {
      logVideoJSEvent('SEEKING', vjsPlayer);
      logPlayer('VJS', '⏩ Seeking to:', vjsPlayer.currentTime());
    });
    
    vjsPlayer.on('seeked', () => {
      logVideoJSEvent('SEEKED', vjsPlayer);
      logPlayer('VJS', '⏩ Seek completed at:', vjsPlayer.currentTime());
    });
    
    vjsPlayer.on('timeupdate', () => {
      // Log every 10 seconds to avoid flooding
      if (Math.floor(vjsPlayer.currentTime()) % 10 === 0 && vjsPlayer.currentTime() > 0) {
        logPlayer('VJS', '⏱️ Time update:', {
          currentTime: vjsPlayer.currentTime(),
          duration: vjsPlayer.duration(),
          percentage: ((vjsPlayer.currentTime() / vjsPlayer.duration()) * 100).toFixed(2) + '%'
        });
      }
    });
    
    vjsPlayer.on('ratechange', () => {
      logVideoJSEvent('RATECHANGE', vjsPlayer);
      logPlayer('VJS', '⚡ Playback rate changed:', vjsPlayer.playbackRate());
    });
    
    vjsPlayer.on('volumechange', () => {
      logVideoJSEvent('VOLUMECHANGE', vjsPlayer);
      logPlayer('VJS', '🔊 Volume changed:', { volume: vjsPlayer.volume(), muted: vjsPlayer.muted() });
    });
    
    vjsPlayer.on('durationchange', () => {
      logVideoJSEvent('DURATIONCHANGE', vjsPlayer);
      logPlayer('VJS', '⏱️ Duration changed:', vjsPlayer.duration());
    });
    
    vjsPlayer.on('progress', () => {
      const buffered = vjsPlayer.buffered();
      if (buffered.length > 0) {
        logPlayer('VJS', '📊 Buffer progress:', {
          bufferedEnd: buffered.end(buffered.length - 1),
          duration: vjsPlayer.duration()
        });
      }
    });

    const initializeEME = () => {
      return new Promise((resolve, reject) => {
        logPlayer('EME', 'Waiting for player ready state...');
        vjsPlayer.ready(() => {
          logPlayer('EME', 'Player is ready, checking EME plugin...');
          if (typeof vjsPlayer.eme === 'function') {
            logPlayer('EME', '✅ EME plugin found, initializing...');
            try {
              vjsPlayer.eme();
              logPlayer('EME', '✅ EME plugin initialized successfully');
              resolve(true);
            } catch (error) {
              logPlayer('ERROR', '🔴 EME initialization error:', error);
              reject(error);
            }
          } else {
            logPlayer('ERROR', '🔴 EME plugin is missing!');
            reject(new Error('EME initialization failed'));
          }
        });
      });
    };

    const initializePlayer = async () => {
      try {
        await initializeEME();
        console.log('EME initialized successfully');

        player.current = vjsPlayer;
        const playerInstance = player.current;
        const LICENSE_REQUEST_TIMEOUT = 10000;

        logPlayer('CAST', 'Setting up LOAD message interceptor...');
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.LOAD,
          async (loadRequestData) => {
            logPlayer('CAST', '📱 LOAD request received from mobile device');
            logLoadRequest(loadRequestData);

            if (!loadRequestData?.media?.contentUrl) {
              logPlayer('ERROR', '🔴 Invalid media request or missing contentUrl');
              logPlayer('ERROR', 'Received media object:', loadRequestData?.media);
              return null;
            }

            setCastingData(loadRequestData);
            logPlayer('CAST', 'Casting data saved to state');

            let playURL = loadRequestData.media.contentUrl;
            const contentType = loadRequestData.media.contentType;
            const mediaDuration = loadRequestData?.media?.duration || 0;
            const rawSeekTime = loadRequestData?.currentTime || 0;
            
            // Determine if currentTime is in milliseconds or seconds
            // If currentTime > duration, it's likely in milliseconds
            let requestedSeekTime;
            if (loadRequestData.media?.customData?.watchFromStart === true) {
              requestedSeekTime = 0;
              logPlayer('SEEK', '⏩ watchFromStart is true, forcing seek to 0s');
              
              // Remove start/end parameters from URL to force playback from beginning
              if (playURL && playURL.includes('?')) {
                try {
                  const urlParts = playURL.split('?');
                  const baseUrl = urlParts[0];
                  const params = new URLSearchParams(urlParts[1]);
                  params.delete('start');
                  params.delete('end');
                  playURL = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
                  logPlayer('SEEK', '✅ Removed start/end parameters from manifest URL');
                  logPlayer('SEEK', 'Modified URL:', playURL);
                } catch (error) {
                  logPlayer('ERROR', '⚠️ Failed to modify URL, using original:', error);
                  playURL = loadRequestData.media.contentUrl;
                }
              }
            } else if (rawSeekTime > mediaDuration && mediaDuration > 0) {
              // currentTime is in milliseconds, convert to seconds
              requestedSeekTime = rawSeekTime / 1000;
              logPlayer('SEEK', `⏩ Detected milliseconds format: ${rawSeekTime}ms → ${requestedSeekTime}s`);
            } else {
              // currentTime is already in seconds
              requestedSeekTime = rawSeekTime;
              logPlayer('SEEK', `⏩ Detected seconds format: ${requestedSeekTime}s`);
            }
            
            const hasDRM = !!(
              loadRequestData.media.customData?.licenseServerURL &&
              loadRequestData.media.customData?.mediaId &&
              loadRequestData.media.customData?.drmTicket
            );
            
            logPlayer('CAST', 'Content info:', { playURL, contentType, hasDRM, rawSeekTime, requestedSeekTime, mediaDuration });
            
            if (hasDRM) {
              logDRMInfo(loadRequestData.media.customData);
            }

            try {
              if (!player.current) {
                throw new Error("Player instance is not initialized.");
              }

              playerInstance.pause();

              if (!hasDRM) {
                logPlayer('PLAYBACK', 'Setting up non-DRM content');
                playerInstance.src({ src: playURL, type: contentType });
                logPlayer('PLAYBACK', '✅ Non-DRM source set');
                
                // Seek to requested time after metadata is loaded
                if (requestedSeekTime > 0) {
                  logPlayer('SEEK', `⏩ Non-DRM content - Will seek to ${requestedSeekTime}s after metadata loads`);
                  playerInstance.one('loadedmetadata', () => {
                    if (playerInstance.duration() > 0 && requestedSeekTime < playerInstance.duration()) {
                      logPlayer('SEEK', `🎬 Seeking to ${requestedSeekTime}s (duration: ${playerInstance.duration()}s)`);
                      playerInstance.currentTime(requestedSeekTime);
                    } else {
                      logPlayer('SEEK', `⚠️ Cannot seek: seekTime=${requestedSeekTime}s, duration=${playerInstance.duration()}s`);
                    }
                  });
                }
              } else {
                logPlayer('DRM', '🔐 Setting up DRM content...');
                const drmInfo = `${loadRequestData.media.customData.licenseServerURL}?contentId=${loadRequestData.media.customData.mediaId}`;
                const drmTicket = loadRequestData.media.customData.drmTicket;
                let pendingRequests = new Set();
                
                logPlayer('DRM', 'DRM Info URL:', drmInfo);
                logPlayer('DRM', 'DRM Ticket (first 50 chars):', drmTicket?.substring(0, 50) + '...');
                
                const keySystemConfig = {
                  'com.widevine.alpha': {
                    videoRobustness: 'SW_SECURE_DECODE',
                    audioRobustness: 'SW_SECURE_CRYPTO',
                    persistentState: 'optional',
                    distinctiveIdentifier: 'optional',
                    getLicense: async (emeOptions, keyMessage, callback) => {
                      logPlayer('DRM', '🔑 Starting DRM license request...');
                      logPlayer('DRM', 'EME Options:', emeOptions);
                      logPlayer('DRM', 'Key Message length:', keyMessage?.byteLength);
                      
                      // Create unique request identifier
                      const requestId = Date.now().toString();
                      pendingRequests.add(requestId);
                      logPlayer('DRM', `📤 License request ${requestId} started`);
                      logPlayer('DRM', 'Pending requests:', Array.from(pendingRequests));

                      // Create abort controller for timeout
                      const abortController = new AbortController();
                      const timeoutId = setTimeout(() => {
                        logPlayer('DRM', `⏰ License request ${requestId} timed out after ${LICENSE_REQUEST_TIMEOUT}ms`);
                        abortController.abort();
                        pendingRequests.delete(requestId);
                        callback(new Error('License request timeout'));
                      }, LICENSE_REQUEST_TIMEOUT);

                      try {
                        logPlayer('DRM', `🌐 Fetching license from: ${drmInfo}`);
                        const response = await fetch(drmInfo, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${drmTicket}`,
                            'Content-Type': 'application/octet-stream',
                            'Accept': 'application/base64'
                          },
                          body: keyMessage,
                          signal: abortController.signal,
                          redirect: 'follow',
                        });

                        clearTimeout(timeoutId);
                        pendingRequests.delete(requestId);
                        
                        logPlayer('DRM', `📥 License response received for request ${requestId}:`, {
                          status: response.status,
                          statusText: response.statusText,
                          headers: Object.fromEntries(response.headers.entries())
                        });

                        if (!response.ok) {
                          const errorText = await response.text();
                          logPlayer('ERROR', `🔴 License request failed:`, { status: response.status, errorText });
                          throw new Error(`License request failed: ${response.status} - ${errorText}`);
                        }

                        const license = await response.arrayBuffer();
                        logPlayer('DRM', `✅ License received successfully for request ${requestId}:`, {
                          byteLength: license.byteLength
                        });
                        if (!license || license.byteLength === 0) {
                          logPlayer('ERROR', '🔴 Received empty license from server');
                          throw new Error('Received empty license from server');
                        }

                        callback(null, license);
                      } catch (error) {
                        clearTimeout(timeoutId);
                        pendingRequests.delete(requestId);
                        
                        if (error.name === 'AbortError') {
                          logPlayer('ERROR', `⏰ License request ${requestId} timed out`);
                        } else {
                          logPlayer('ERROR', `🔴 License request ${requestId} failed:`, {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                          });
                        }
                        
                        if (pendingRequests.size === 0) {
                          try {
                            logPlayer('DRM', '🔄 Attempting license request retry...');
                            const retryResponse = await fetch(drmInfo, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${drmTicket}`,
                                'Content-Type': 'application/octet-stream'
                              },
                              body: keyMessage,
                              redirect: 'follow',
                            });
                            
                            logPlayer('DRM', 'Retry response:', {
                              status: retryResponse.status,
                              statusText: retryResponse.statusText
                            });

                            if (!retryResponse.ok) {
                              throw new Error(`Retry failed: ${retryResponse.status}`);
                            }

                            const retryLicense = await retryResponse.arrayBuffer();
                            logPlayer('DRM', 'Retry license size:', retryLicense.byteLength);
                            if (!retryLicense || retryLicense.byteLength === 0) {
                              throw new Error('Retry received empty license');
                            }

                            logPlayer('DRM', '✅ License retry successful');
                            callback(null, retryLicense);
                          } catch (retryError) {
                            logPlayer('ERROR', '🔴 License retry failed:', {
                              name: retryError.name,
                              message: retryError.message
                            });
                            callback(retryError);
                          }
                        } else {
                          logPlayer('DRM', 'Other pending requests exist, not retrying');
                          callback(error);
                        }
                      }
                    }
                  }
                };

                logPlayer('DRM', '🔧 Applying DRM configuration...');
                logPlayer('DRM', 'Key system config:', JSON.stringify(Object.keys(keySystemConfig)));
                playerInstance.src({
                  src: playURL,
                  type: contentType,
                  keySystems: keySystemConfig
                });
                logPlayer('DRM', '✅ DRM source set');

                // Seek to requested time after metadata is loaded for DRM content
                if (requestedSeekTime > 0) {
                  logPlayer('SEEK', `⏩ DRM content - Will seek to ${requestedSeekTime}s after metadata loads`);
                  playerInstance.one('loadedmetadata', () => {
                    if (playerInstance.duration() > 0 && requestedSeekTime < playerInstance.duration()) {
                      logPlayer('SEEK', `🎬 DRM content - Seeking to ${requestedSeekTime}s (duration: ${playerInstance.duration()}s)`);
                      playerInstance.currentTime(requestedSeekTime);
                    } else {
                      logPlayer('SEEK', `⚠️ DRM content - Cannot seek: seekTime=${requestedSeekTime}s, duration=${playerInstance.duration()}s`);
                    }
                  });
                }

                playerInstance.on('emeError', (error) => {
                  logPlayer('ERROR', '🔴 EME error occurred:', {
                    error: error,
                    message: error?.message,
                    code: error?.code
                  });
                  logPlayer('DRM', '🔄 Attempting to recover from EME error...');
                  playerInstance.src({
                    src: playURL,
                    type: contentType,
                    keySystems: keySystemConfig
                  });
                });
                
                let playbackTimeout = null;
                playerInstance.on('waiting', () => {
                  logPlayer('PLAYBACK', '⏳ Playback waiting, starting recovery timer...');
                  if (playbackTimeout) clearTimeout(playbackTimeout);
                  playbackTimeout = setTimeout(() => {
                    if (playerInstance.readyState() < 3) {
                      logPlayer('PLAYBACK', '⚠️ Playback stalled (readyState < 3), attempting recovery...');
                      logPlayer('PLAYBACK', 'Current readyState:', playerInstance.readyState());
                      playerInstance.src({
                        src: playURL,
                        type: contentType,
                        keySystems: keySystemConfig
                      });
                    } else {
                      logPlayer('PLAYBACK', '✅ Playback recovered, readyState:', playerInstance.readyState());
                    }
                  }, 10000);
                });

                playerInstance.on('playing', () => {
                  logPlayer('PLAYBACK', '▶️ DRM content playing');
                  if (playbackTimeout) {
                    clearTimeout(playbackTimeout);
                    playbackTimeout = null;
                    logPlayer('PLAYBACK', 'Recovery timer cleared');
                  }
                  setShowBranding(false);
                });
              }
              

              logPlayer('CAST', '✅ LOAD request processing complete');
              return loadRequestData;
            } catch (error) {
              logPlayer('ERROR', '🔴 Error setting up content:', {
                name: error.name,
                message: error.message,
                stack: error.stack
              });
              setShowBranding(true);
              return null;
            }
          }
        );
        
        // Add additional Cast message interceptors for detailed logging
        logPlayer('CAST', 'Setting up additional message interceptors...');
        
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.PLAY,
          (requestData) => {
            logPlayer('CAST', '📱 PLAY request received from mobile:', requestData);
            return requestData;
          }
        );
        
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.PAUSE,
          (requestData) => {
            logPlayer('CAST', '📱 PAUSE request received from mobile:', requestData);
            return requestData;
          }
        );
        
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.STOP,
          (requestData) => {
            logPlayer('CAST', '📱 STOP request received from mobile:', requestData);
            return requestData;
          }
        );
        
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.SEEK,
          (requestData) => {
            logPlayer('CAST', '📱 SEEK request received from mobile:', {
              currentTime: requestData?.currentTime,
              resumeState: requestData?.resumeState
            });
            return requestData;
          }
        );
        
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.SET_VOLUME,
          (requestData) => {
            logPlayer('CAST', '📱 SET_VOLUME request received from mobile:', requestData?.volume);
            return requestData;
          }
        );
        
        playerManager.setMessageInterceptor(
          cast.framework.messages.MessageType.MEDIA_STATUS,
          (requestData) => {
            logPlayer('CAST', '📱 MEDIA_STATUS request:', requestData);
            return requestData;
          }
        );
        
      } catch (error) {
        logPlayer('ERROR', '🔴 Failed to initialize player:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    };

    initializePlayer();

    return () => {
      logPlayer('CLEANUP', '🧹 Cleaning up player...');
      if (player.current) {
        logPlayer('CLEANUP', 'Disposing VideoJS player instance');
        player.current.dispose();
      }
    };
  }, [playerManager, context]); 

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#000',
        position: 'relative',
      }}
    >
      <video
        ref={videoNode}
        className="video-js vjs-default-skin vjs-big-play-centered vjs-fluid"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
        x-webkit-airplay="allow"
        webkit-playsinline="true"
        playsInline
        encrypted-media="true"
      />
      {showBranding && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Branding user={userData} />
        </div>
      )}
    </div>
  );
};

export default Player;