/* global cast */
import React, { useEffect, useState,useRef } from 'react';
import Player from './Player';
import './styles.css';

let context; 

const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [userData, setUserData] = useState({});
  const [message,setMessage] = useState(null)
  const bitmovinPlayerRef = useRef(null);
  const [paused,setPaused] = useState(false);

  // Mobile cihaza mesaj gönderme fonksiyonu
  const sendMessageToMobile = (messageType, data) => {
    if (context) {
      const messageData = {
        type: messageType,
        timestamp: Date.now(),
        receiverId: context.getApplicationData()?.applicationId || 'chromecast_receiver',
        ...data
      };
      
      console.log('📤 Sending message to mobile:', messageData);
      
      // Ana namespace'e mesaj gönder
      try {
        context.sendCustomMessage('urn:x-cast:com.todtv.tod', undefined, messageData);
        console.log('✅ Message sent successfully to main namespace');
      } catch (error) {
        console.error('❌ Error sending message to main namespace:', error);
      }
      
      // Alternatif namespace'lere de gönder
      const alternativeNamespaces = [
        'urn:x-cast:com.todtv.tod',
        'urn:x-cast:com.todtv',
        'urn:x-cast:com.tod'
      ];
      
      alternativeNamespaces.forEach(namespace => {
        try {
          context.sendCustomMessage(namespace, undefined, messageData);
          console.log(`✅ Message sent to alternative namespace: ${namespace}`);
        } catch (error) {
          console.error(`❌ Error sending message to ${namespace}:`, error);
        }
      });
    } else {
      console.warn('⚠️ Cast context not available for sending message');
    }
  };
  
  // Test mesajı gönderme fonksiyonu (geliştirme amaçlı)
  const sendTestMessage = () => {
    sendMessageToMobile('receiver_status', {
      status: 'ready',
      capabilities: ['video_playback', 'pause_resume', 'seek'],
      version: '1.0.0'
    });
  };

  useEffect(() => {
    // Log if Cast SDK is available
    console.log('Cast SDK available:', typeof cast !== 'undefined' && !!cast.framework);
    
    if (typeof cast !== 'undefined' && cast.framework && cast.framework.CastReceiverContext && !context) {
      // Log Cast SDK version if available
      if (cast.framework.VERSION) {
        console.log('Cast SDK Version:', cast.framework.VERSION);
      }
      
      // Initialize the context
      context = cast.framework.CastReceiverContext.getInstance();
      console.log("Context instance created:", !!context);
      
      // Log available methods on context for debugging
      console.log("Available context methods:", 
        Object.getOwnPropertyNames(Object.getPrototypeOf(context)).join(', '));
      
      // Monitor system-level CUSTOM_MESSAGE events - this catches ALL custom messages
      console.log("Setting up system-level custom message monitoring...");
      context.addEventListener(cast.framework.system.EventType.CUSTOM_MESSAGE, (event) => {
        console.log('🔍 SYSTEM CUSTOM_MESSAGE event:', event);
        
        if (event.data) {
          console.log('🔍 Message namespace:', event.data.namespace);
          console.log('🔍 Message content:', event.data.message);
          
          // Log if this is our target namespace
          if (event.data.namespace === 'urn:x-cast:com.todtv.tod.extendsession') {
            console.log('✅ CONFIRMED: Message received on target namespace!');
            
            // Try to process this message
            try {
              const messageData = typeof event.data.message === 'string' 
                ? JSON.parse(event.data.message) 
                : event.data.message;
                
              console.log('Parsed system message data:', messageData);
              setUserData(messageData); // Update state with this data
            } catch (error) {
              console.error('Error parsing system message:', error);
            }
          } else {
            console.log('⚠️ Message received on different namespace:', event.data.namespace);
          }
        }
      });
      
      // Add listener for our custom namespace with enhanced logging
      console.log("Adding custom message listener...");
      context.addCustomMessageListener('urn:x-cast:com.todtv.tod.extendsession', (event) => {
        console.log("Full event object:", event);
        console.log("Sender ID:", event.senderId);
        console.log("Data type:", typeof event.data);
        console.log("Raw data:", event.data);
  
        try {
          // Only parse if the data is a string
          if (typeof event.data === 'string') {
            const user = JSON.parse(event.data);
            console.log("📌 Parsed user data:", user);
            setUserData(user);
          } else {
            // If data is not a string, use it directly
            console.log("📌 Using data directly (not a string)");
            setUserData(event.data);
          }
        } catch (error) {
          console.error("Error parsing message data:", error);
        }
      });

      // Also try registering for variations of the namespace
      const alternativeNamespaces = [
        'urn:x-cast:com.todtv.tod',
        'urn:x-cast:com.todtv',
        'urn:x-cast:com.tod'
      ];
      
      alternativeNamespaces.forEach(namespace => {
        console.log(`Registering listener for alternative namespace: ${namespace}`);
        context.addCustomMessageListener(namespace, (event) => {
          console.log(`Message received on alternative namespace - App.js [${namespace}]:`, event);
          setMessage("Mobilden gelen mesaj : ",event)
          if(event.data.type==='playback_state'){
            console.log('Playback state change requested. Current paused state:', paused);
            console.log('Player current state:', {
              isPaused: bitmovinPlayerRef.current?.isPaused(),
              isPlaying: bitmovinPlayerRef.current?.isPlaying(),
              hasSource: bitmovinPlayerRef.current?.getSource() !== null
            });
            
            if(bitmovinPlayerRef.current){
              if(bitmovinPlayerRef.current.isPaused() || !bitmovinPlayerRef.current.isPlaying()){
                console.log('Playing video...');
                bitmovinPlayerRef.current.play().then(() => {
                  console.log('Video play started successfully');
                  setPaused(false);
                  
                  // Mobile cihaza oynatma durumu bilgisi gönder
                  sendMessageToMobile('video_status', {
                    status: 'playing',
                    currentTime: bitmovinPlayerRef.current.getCurrentTime(),
                    duration: bitmovinPlayerRef.current.getDuration()
                  });
                }).catch(error => {
                  console.error('Error playing video:', error);
                  
                  // Mobile cihaza hata bilgisi gönder
                  sendMessageToMobile('video_error', {
                    error: 'play_failed',
                    message: error.message
                  });
                });
              } else {
                console.log('Pausing video...');
                bitmovinPlayerRef.current.pause();
                setPaused(true);
                
                // Mobile cihaza duraklatma durumu bilgisi gönder
                sendMessageToMobile('video_status', {
                  status: 'paused',
                  currentTime: bitmovinPlayerRef.current.getCurrentTime(),
                  duration: bitmovinPlayerRef.current.getDuration()
                });
              }
            } else {
              console.warn('Player reference not available');
              
              // Mobile cihaza hata bilgisi gönder
              sendMessageToMobile('video_error', {
                error: 'player_not_available',
                message: 'Player reference not available'
              });
            }
          }

          if(event.data.type==='time_update'){
       
            const currentTime = event.data.currentTime;
            const offsetInSeconds = currentTime /1000
            const newTime = bitmovinPlayerRef.current.getCurrentTime()+offsetInSeconds
            const duration = bitmovinPlayerRef.current.getDuration()
            const safeTime = Math.min(Math.max(newTime,0),duration)
            bitmovinPlayerRef.current.seek(safeTime);
          }
          
          try {
            const data = typeof event.data === 'string' 
              ? JSON.parse(event.data) 
              : event.data;
              
            console.log(`Parsed data from ${namespace}:`, data);
            setUserData(data);
          } catch (error) {
            console.error(`Error parsing data from ${namespace}:`, error);
          }
        });
      });

      // Add system event listeners for debugging
      context.addEventListener(cast.framework.system.EventType.READY, (event) => {
         console.log('Cast system READY event received:', event);
         console.log('Receiver is now ready for connections');
         
         // Mobile cihaza receiver hazır bilgisi gönder
         sendMessageToMobile('receiver_ready', {
           status: 'ready',
           timestamp: Date.now(),
           capabilities: ['video_playback', 'pause_resume', 'seek', 'volume_control']
         });
       });
      
      context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
        console.log('SENDER_CONNECTED event:', event);
        console.log('Sender connected. ID:', event.senderId);
        console.log('Waiting for messages on namespace: urn:x-cast:com.todtv.tod.extendsession');
        
        // Log all connected senders
        const senders = context.getSenders();
        console.log('👥 All connected senders:', senders.map(s => s.id));
      });
      
      context.addEventListener(cast.framework.system.EventType.ERROR, (event) => {
        console.error('Cast ERROR event:', event);
      });

      try {
        // Start the context with detailed options and explicit namespace registration
        context.start({
          customNamespaces: {
            'urn:x-cast:com.todtv.tod.extendsession': 'JSON',
            'urn:x-cast:com.todtv.tod': 'JSON',
            'urn:x-cast:com.todtv': 'JSON',
            'urn:x-cast:com.tod': 'JSON'
          },
          statusText: 'Ready to receive cast content',
          maxInactivity: 60000,  // Longer timeout for debugging
          disableIdleTimeout: true  // Prevent timing out during debugging
        });
        console.log("Cast Receiver Context started");
        console.log("Is system ready:", context.isSystemReady);

        const playerManager = context.getPlayerManager();
        console.log("Player manager obtained:", !!playerManager);

        playerManager.addEventListener(
          cast.framework.events.EventType.PLAYING,
          () => {
            console.log("Video playback started");
            setIsPlaying(true);
          }
        );

        playerManager.addEventListener(
          cast.framework.events.EventType.IDLE,
          () => {
            console.log("Video playback stopped or no media loaded");
            setIsPlaying(false);
          }
        );
      } catch (error) {
        console.error("Error starting Cast Receiver Context:", error);
      }
    } else {
      if (typeof cast === 'undefined') {
        console.error("Cast is undefined - SDK not loaded");
      } else if (!cast.framework) {
        console.error("Cast framework is not available");
      } 
    }
    
    // Return cleanup function
    return () => {
      console.log("Component unmounting, cleanup...");
      // Additional cleanup if needed
    };
  }, []);
  
  // Progress bilgilerini düzenli olarak mobil cihaza gönder
  useEffect(() => {
    let progressInterval;
    
    if (isPlaying && bitmovinPlayerRef.current) {
      progressInterval = setInterval(() => {
        if (bitmovinPlayerRef.current && !bitmovinPlayerRef.current.isPaused()) {
          const currentTime = bitmovinPlayerRef.current.getCurrentTime();
          const duration = bitmovinPlayerRef.current.getDuration();
          const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
          
          // RemoteMediaClient için progress bilgisi gönder
          sendMessageToMobile('media_progress', {
            currentTime: currentTime,
            duration: duration,
            progress: progress,
            isPlaying: !bitmovinPlayerRef.current.isPaused(),
            timestamp: Date.now(),
            // Android RemoteMediaClient için ek bilgiler
            mediaInfo: {
              currentTime: Math.floor(currentTime * 1000), // milisaniye cinsinden
              duration: Math.floor(duration * 1000), // milisaniye cinsinden
              playbackRate: 1.0,
              playerState: bitmovinPlayerRef.current.isPaused() ? 'PAUSED' : 'PLAYING'
            }
          });
        }
      }, 1000); // Her saniye güncelle
    }
    
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [isPlaying, sendMessageToMobile]);

  return (
    <div>
      <Player userData={userData} message={message} bitmovinPlayerRef={bitmovinPlayerRef} sendMessageToMobile={sendMessageToMobile} />
    </div>
  );
};

export default App;