/* global cast */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Player as BitmovinPlayer, PlayerEvent } from 'bitmovin-player';
import initChromecastMux from '@mux/mux-data-chromecast';
import Branding from './Branding';

const Player = ({ userData, message, bitmovinPlayerRef, sendMessageToMobile }) => {
  console.warn("Player component rendered dev");
  const contextRef = useRef(null);
  if (!contextRef.current) {
    contextRef.current = cast.framework.CastReceiverContext.getInstance();
  }
  const context = contextRef.current;
  const playerManager = context.getPlayerManager();
  
  const playerElementRef = useRef(null);
  const [showBranding, setShowBranding] = useState(true);
  const [multiplayState, setMultiplayState] = useState(null);
  const interval = useRef(null);

  const PLAYER_KEY = process.env.PLAYER_KEY || '047DDDE8-7D3F-4355-959A-4DC51EC5B10E';
  const MUX_ENV_KEY = process.env.REACT_APP_MUX_ENV_KEY || 'r5ovdkei484nkv476ga0nbnhh'; // Mux Environment Key

  const playerConfig = useMemo(() => ({
    key: PLAYER_KEY,
    ui: false,
    playback: {
      autoplay: false,
      muted: false,
    },
    adaptation: {
      preload: true
    },
    tweaks: {
      max_buffer_level: 30,
      native_fullscreen: true,
      file_protocol: true
    }
  }), [PLAYER_KEY]);

  const checkMultiplay = useCallback(async () => {
    try {
      if (!multiplayState || !multiplayState.token) {
        console.info('No token available for multiplay check');
        return;
      }
      
      const response = await fetch('https://mobileservice.apac.beiniz.biz/api/play/check-multi-play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        credentials: 'include',
        body: JSON.stringify({
          Cookies: [
            {
              Key: "token",
              Value: multiplayState.token
            }
          ]
        })
      });
      
      // Response'u JSON olarak parse et
      const data = await response.json();
      
      console.info('Multiplay check response:', data);
      
      // Başarısız yanıt durumunda (isSuccess=false) yayını sonlandır
      if (!response.ok || (data && !data.isSuccess)) {
        const errorCode = data?.message?.displayCode || 
                          data?.errorCode || 
                          data?.message?.code || 
                          data?.code || 
                          response.status;
                          
        const errorText = data?.message?.text || 'Multiplay error detected';
        
        console.error(`Multiplay check failed: ${errorText} (Code: ${errorCode})`);

        if (bitmovinPlayerRef.current) {
          bitmovinPlayerRef.current.unload();
          console.info('Stream has been terminated due to multiplay check failure');
        }
        
        if (interval.current) {
          clearInterval(interval.current);
          interval.current = null;
        } 

        setMultiplayState(null);
        setShowBranding(true);
      }
    } catch (error) {
      console.error('Failed to execute multiplay check:', error);
    }
  }, [multiplayState]);

  useEffect(() => {
    if (multiplayState && !interval.current) {
      interval.current = setInterval(() => {
        checkMultiplay();
      }, 60000);
    }
  
    return () => {
      if (interval.current) {
        clearInterval(interval.current);
        interval.current = null;
      }
    };
  }, [multiplayState, checkMultiplay]);

  useEffect(() => {
    if (bitmovinPlayerRef.current) return;

    if (!playerElementRef.current) {
      console.error("Player element is not ready yet");
      return;
    }

    try {
      const player = new BitmovinPlayer(playerElementRef.current, playerConfig);
      
      player.on(PlayerEvent.Play, () => {
        console.info('Player Play');
        setShowBranding(false);
        
        // Mobile cihaza oynatma başladı bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'play',
            currentTime: player.getCurrentTime(),
            duration: player.getDuration()
          });
        }
      });
      
      player.on(PlayerEvent.SourceLoaded, () => {
        console.info('Player SourceLoaded');
        setShowBranding(true);
        
        // Mobile cihaza kaynak yüklendi bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'source_loaded',
            duration: player.getDuration(),
            source: player.getSource()
          });
        }
      });
      
      player.on(PlayerEvent.Playing, () => {
        console.info('Player Playing');
        setShowBranding(false);
        
        // Mobile cihaza oynatma devam ediyor bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'playing',
            currentTime: player.getCurrentTime(),
            duration: player.getDuration()
          });
        }
      });
      
      player.on(PlayerEvent.Error, (error) => {
        console.info('Player Error', error);
        
        // Mobile cihaza hata bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_error', {
            error: error.code || 'unknown_error',
            message: error.message || 'An error occurred',
            details: error
          });
        }
      });

      player.on(PlayerEvent.Warning, (warning) => {
        console.info('Player Warning', warning);
      });

      player.on(PlayerEvent.DrmLicenseAdded, () => {
        console.info('Player DrmLicenseAdded');
      });

      player.on(PlayerEvent.StallStarted, (event) => {
        console.info('Player Stall Started', event);
      });

      player.on(PlayerEvent.StallEnded, () => {
        console.info('Player Stall Ended');
      });
      
      player.on(PlayerEvent.Seek, (event) => {
        console.info('Player Seek', event);
        
        // Mobile cihaza seek olayı bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'seek',
            seekTarget: event.seekTarget,
            currentTime: player.getCurrentTime(),
            duration: player.getDuration()
          });
        }
      });
      
      player.on(PlayerEvent.Seeked, (event) => {
        console.info('Player Seeked', event);
        
        // Mobile cihaza seek tamamlandı bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'seeked',
            currentTime: player.getCurrentTime(),
            duration: player.getDuration()
          });
        }
      });
      
      player.on(PlayerEvent.TimeChanged, (event) => {
        // Düzenli progress bilgilerini mobil cihaza gönder (her saniye)
        const currentTime = event.time;
        const duration = player.getDuration();
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        
        // Mobile cihaza detaylı progress bilgisi gönder (RemoteMediaClient uyumlu)
        if (sendMessageToMobile) {
          sendMessageToMobile('media_progress', {
            currentTime: currentTime,
            duration: duration,
            progress: progress, // Yüzde olarak progress
            bufferedTime: player.getTimeShift() || 0,
            isPlaying: !player.isPaused(),
            timestamp: Date.now(),
            // Android RemoteMediaClient için ek bilgiler
            mediaInfo: {
              currentTime: Math.floor(currentTime * 1000), // milisaniye cinsinden
              duration: Math.floor(duration * 1000), // milisaniye cinsinden
              playbackRate: 1.0,
              playerState: player.isPaused() ? 'PAUSED' : 'PLAYING'
            }
          });
        }
      });
      
      player.on(PlayerEvent.Paused, () => {
        console.info('Player Paused');
        setShowBranding(true);
        
        // Mobile cihaza duraklatıldı bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'paused',
            currentTime: player.getCurrentTime(),
            duration: player.getDuration()
          });
        }
      });
      
      player.on(PlayerEvent.PlaybackFinished, () => {
        console.info('Player Playback Finished');
        setShowBranding(true);
        
        // Mobile cihaza oynatma bitti bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('player_event', {
            event: 'ended',
            currentTime: player.getCurrentTime(),
            duration: player.getDuration()
          });
        }
      });
      
      bitmovinPlayerRef.current = player;

      playerManager.setMessageInterceptor(
        cast.framework.messages.MessageType.LOAD,
        (loadRequestData) => handleLoadRequest(loadRequestData, player)
      );
    } catch (error) {
      console.error('Failed to initialize player:', error);
    }

    return () => {
      if (bitmovinPlayerRef.current) {
        bitmovinPlayerRef.current.destroy();
        bitmovinPlayerRef.current = null;
      }
    };
  }, [playerConfig, playerManager]);

  useEffect(()=>{
    console.info('Message geldi. Player.js de',message)
  },[message])

  const handleLoadRequest = async (loadRequestData, player) => {
    console.log("LOAD request received on Receiver:", loadRequestData);

    if (!loadRequestData?.media?.contentId) {
      console.error("Invalid media request or missing contentId.");
      
      // Mobile cihaza hata bilgisi gönder
      if (sendMessageToMobile) {
        sendMessageToMobile('load_error', {
          error: 'missing_content_id',
          message: 'Invalid media request or missing contentId'
        });
      }
      
      return null;
    }
    
    // Mobile cihaza video yükleme başladı bilgisi gönder
    if (sendMessageToMobile) {
      sendMessageToMobile('load_start', {
        contentId: loadRequestData.media.contentId,
        title: loadRequestData.media.metadata?.title || 'Unknown Title',
        streamType: loadRequestData.media.streamType || 'BUFFERED'
      });
    }

    // Initialize Mux Data SDK for each new video load
    try {
      const playerInitTime = Date.now();
      const isLiveStream = loadRequestData.media.streamType === 'LIVE';
      const hasCustomData = loadRequestData.media.customData;
      
      // Prepare Mux metadata
      const muxMetadata = {
        env_key: MUX_ENV_KEY,
        player_name: 'Bitmovin Chromecast Player',
        player_init_time: playerInitTime,
        video_title: loadRequestData.media.metadata?.title || loadRequestData.media.metadata?.subtitle || 'Chromecast Video',
        video_id: loadRequestData.media.contentId,
        video_stream_type: isLiveStream ? 'live' : 'on-demand',
        player_version: '8.206.0',
        page_type: 'chromecast_receiver',
        viewer_device_category: 'tv',
        player_software_name: 'Bitmovin Player',
        player_software_version: '8.206.0'
      };

      // Add custom metadata if available
      if (hasCustomData) {
        if (hasCustomData.token) {
          muxMetadata.viewer_user_id = hasCustomData.token.substring(0, 32); // Truncate for privacy
          muxMetadata.custom_1 = 'authenticated';
        } else {
          muxMetadata.custom_1 = 'anonymous';
        }
        
        if (hasCustomData.drmTicket) {
          muxMetadata.custom_2 = 'drm_protected';
        } else {
          muxMetadata.custom_2 = 'clear_content';
        }
        
        if (hasCustomData.licenseserver) {
          muxMetadata.custom_3 = 'license_server_used';
        }
      }

      // Initialize or reinitialize Mux for new content
      initChromecastMux(playerManager, {
        debug: process.env.NODE_ENV === 'development', // Enable debug in development
        data: muxMetadata
      });
      
      console.info('Mux Data SDK initialized for new content:', {
        title: muxMetadata.video_title,
        type: muxMetadata.video_stream_type,
        authenticated: muxMetadata.custom_1
      });
    } catch (error) {
      console.error('Failed to initialize Mux Data SDK:', error);
    }

    const playURL = loadRequestData.media.contentId;
    const contentType = loadRequestData.media.contentType;

    const hasDRM = true
    
      
    try {
      if (!player) {
        throw new Error("Player instance is not initialized.");
      }
      player.unload();
      const playerSource = {
        dash: undefined,
        hls: undefined,
        smooth: undefined,
        drm: undefined
      };
      if (contentType && contentType.includes('dash')) {
        playerSource.dash = playURL;
      } else if (contentType && contentType.includes('hls')) {
        playerSource.hls = playURL;
      } else if (contentType && contentType.includes('smooth') || contentType && contentType.includes('ism')) {
        playerSource.smooth = playURL;
      } else {
        playerSource.dash = playURL;
        playerSource.hls = playURL;
      }

      if (hasDRM) {
        const drmToken = loadRequestData.media.customData?.drmtoken || "";
        
        playerSource.drm = {
          widevine: {
            LA_URL: loadRequestData.media.customData.licenseserver,
            headers: {
              'X-CB-Ticket': loadRequestData.media.customData.drmTicket,
              'Authorization': drmToken,
              'Content-Type': 'application/octet-stream',
            },
            withCredentials: false,
            prepareLicense: function(license) {
              console.info('widevine drm license: ' + license);
              return license;
            },
            prepareMessage: function(keyMessage) {
              console.info('Widevine drm message: ' + JSON.stringify(keyMessage));
              return keyMessage.message;
            },
            robustness: {
              video: 'SW_SECURE_DECODE',
              audio: 'SW_SECURE_CRYPTO'
            }
          },
          playready: {
            LA_URL: loadRequestData.media.customData.licenseserver,
            headers: {
              'X-CB-Ticket': loadRequestData.media.customData.drmTicket,
              'Authorization': drmToken,
              // 'Content-Type': 'text/xml',
            },
            utf8message: true,
            plaintextChallenge: true,
            prepareMessage: function(keyMessage) {
              console.info('Playready drm message: ' + JSON.stringify(keyMessage));
              return keyMessage.message;
            }
          }
        };
      }

      console.log("Loading source with config:", playerSource);
      
      try {
        if (loadRequestData.media.customData?.token) {
          setMultiplayState({
            token: loadRequestData.media.customData.token
          });
        }
        
        await player.load(playerSource);
        console.info("Bitmovin player source loaded successfully");
        
        // Mobile cihaza video yükleme başarılı bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('load_success', {
            contentId: loadRequestData.media.contentId,
            title: loadRequestData.media.metadata?.title || 'Unknown Title',
            duration: player.getDuration()
          });
        }
        
        player.play();
        return loadRequestData;
      } catch (error) {
        console.error("Error loading source:", error);
        setShowBranding(true);
        
        // Mobile cihaza video yükleme hatası bilgisi gönder
        if (sendMessageToMobile) {
          sendMessageToMobile('load_error', {
            error: 'source_load_failed',
            message: error.message || 'Error loading video source',
            contentId: loadRequestData.media.contentId
          });
        }
        
        return null;
      }
    } catch (error) {
      console.error("Error setting up content:", error);
      setShowBranding(true);
      
      // Mobile cihaza genel hata bilgisi gönder
      if (sendMessageToMobile) {
        sendMessageToMobile('load_error', {
          error: 'setup_failed',
          message: error.message || 'Error setting up content'
        });
      }
      
      return null;
    }
  };

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
      <div
        ref={playerElementRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
        }}
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