/* global cast */
import React, { useEffect, useState } from 'react';
import Player from './Player';
import './styles.css';

let context; 

// Detailed logging helper functions
const logWithTimestamp = (category, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [${category}]`;
  if (data) {
    console.log(`${logPrefix} ${message}`, data);
  } else {
    console.log(`${logPrefix} ${message}`);
  }
};

const logEventDetails = (eventName, event) => {
  logWithTimestamp('EVENT', `========== ${eventName} ==========`);
  logWithTimestamp('EVENT', 'Event Type:', event?.type);
  logWithTimestamp('EVENT', 'Event Data:', event?.data);
  logWithTimestamp('EVENT', 'Sender ID:', event?.senderId);
  logWithTimestamp('EVENT', 'Full Event Object:', JSON.stringify(event, null, 2));
  logWithTimestamp('EVENT', `========== END ${eventName} ==========`);
};

const logMobileData = (source, data) => {
  logWithTimestamp('MOBILE_DATA', `========== Data from ${source} ==========`);
  logWithTimestamp('MOBILE_DATA', 'Data Type:', typeof data);
  logWithTimestamp('MOBILE_DATA', 'Is Array:', Array.isArray(data));
  logWithTimestamp('MOBILE_DATA', 'Raw Data:', data);
  if (typeof data === 'object' && data !== null) {
    logWithTimestamp('MOBILE_DATA', 'Object Keys:', Object.keys(data));
    Object.entries(data).forEach(([key, value]) => {
      logWithTimestamp('MOBILE_DATA', `  ${key}:`, value);
    });
  }
  logWithTimestamp('MOBILE_DATA', `========== END Data from ${source} ==========`);
};

const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [userData, setUserData] = useState({});

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
      logWithTimestamp('CAST', 'Setting up system-level custom message monitoring...');
      context.addEventListener(cast.framework.system.EventType.CUSTOM_MESSAGE, (event) => {
        logEventDetails('SYSTEM_CUSTOM_MESSAGE', event);
        
        if (event.data) {
          logWithTimestamp('CAST', '🔍 Message namespace:', event.data.namespace);
          logWithTimestamp('CAST', '🔍 Message content:', event.data.message);
          logWithTimestamp('CAST', '🔍 Message sender:', event.senderId);
          
          // Log if this is our target namespace
          if (event.data.namespace === 'urn:x-cast:com.todtv.tod.extendsession') {
            logWithTimestamp('CAST', '✅ CONFIRMED: Message received on target namespace!');
            
            // Try to process this message
            try {
              const messageData = typeof event.data.message === 'string' 
                ? JSON.parse(event.data.message) 
                : event.data.message;
              
              logMobileData('SYSTEM_CUSTOM_MESSAGE', messageData);
              setUserData(messageData); // Update state with this data
            } catch (error) {
              logWithTimestamp('ERROR', 'Error parsing system message:', error);
            }
          } else {
            logWithTimestamp('CAST', '⚠️ Message received on different namespace:', event.data.namespace);
          }
        }
      });
      
      // Add listener for our custom namespace with enhanced logging
      logWithTimestamp('CAST', 'Adding custom message listener for: urn:x-cast:com.todtv.tod.extendsession');
      context.addCustomMessageListener('urn:x-cast:com.todtv.tod.extendsession', (event) => {
        logEventDetails('CUSTOM_MESSAGE_EXTENDSESSION', event);
        logWithTimestamp('MOBILE_DATA', '📱 Mobile device sent data on extendsession namespace');
        logWithTimestamp('MOBILE_DATA', 'Sender ID:', event.senderId);
        logWithTimestamp('MOBILE_DATA', 'Data type:', typeof event.data);
        logWithTimestamp('MOBILE_DATA', 'Raw data:', event.data);
        logWithTimestamp('MOBILE_DATA', 'Data length:', typeof event.data === 'string' ? event.data.length : 'N/A');
  
        try {
          // Only parse if the data is a string
          if (typeof event.data === 'string') {
            const user = JSON.parse(event.data);
            logMobileData('PARSED_USER_DATA', user);
            setUserData(user);
          } else {
            // If data is not a string, use it directly
            logWithTimestamp('MOBILE_DATA', '📌 Using data directly (not a string)');
            logMobileData('DIRECT_USER_DATA', event.data);
            setUserData(event.data);
          }
        } catch (error) {
          logWithTimestamp('ERROR', 'Error parsing message data:', error);
          logWithTimestamp('ERROR', 'Error stack:', error.stack);
        }
      });

      // Also try registering for variations of the namespace
      const alternativeNamespaces = [
        'urn:x-cast:com.todtv.tod',
        'urn:x-cast:com.todtv',
        'urn:x-cast:com.tod'
      ];
      
      alternativeNamespaces.forEach(namespace => {
        logWithTimestamp('CAST', `Registering listener for alternative namespace: ${namespace}`);
        context.addCustomMessageListener(namespace, (event) => {
          logEventDetails(`ALT_NAMESPACE_${namespace}`, event);
          logWithTimestamp('MOBILE_DATA', `📱 Mobile device sent data on alternative namespace: ${namespace}`);
          
          try {
            const data = typeof event.data === 'string' 
              ? JSON.parse(event.data) 
              : event.data;
            
            logMobileData(`ALT_NAMESPACE_${namespace}`, data);
            setUserData(data);
          } catch (error) {
            logWithTimestamp('ERROR', `Error parsing data from ${namespace}:`, error);
          }
        });
      });

      // Add system event listeners for debugging
      context.addEventListener(cast.framework.system.EventType.READY, (event) => {
        logEventDetails('CAST_SYSTEM_READY', event);
        logWithTimestamp('CAST', '🟢 Receiver is now ready for connections');
        logWithTimestamp('CAST', 'Application ID:', context.getApplicationData()?.appId);
      });
      
      context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, (event) => {
        logEventDetails('SENDER_CONNECTED', event);
        logWithTimestamp('CAST', '📱 Sender connected. ID:', event.senderId);
        logWithTimestamp('CAST', 'User Agent:', event.userAgent);
        logWithTimestamp('CAST', 'Waiting for messages on namespace: urn:x-cast:com.todtv.tod.extendsession');
        
        // Log all connected senders with details
        const senders = context.getSenders();
        logWithTimestamp('CAST', '👥 Total connected senders:', senders.length);
        senders.forEach((sender, index) => {
          logWithTimestamp('CAST', `  Sender ${index + 1}:`, {
            id: sender.id,
            userAgent: sender.userAgent,
            transport: sender.transport
          });
        });
      });
      
      context.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, (event) => {
        logEventDetails('SENDER_DISCONNECTED', event);
        logWithTimestamp('CAST', '📴 Sender disconnected. ID:', event.senderId);
        logWithTimestamp('CAST', 'Reason:', event.reason);
      });
      
      context.addEventListener(cast.framework.system.EventType.ERROR, (event) => {
        logEventDetails('CAST_ERROR', event);
        logWithTimestamp('ERROR', '🔴 Cast error occurred:', event);
      });
      
      context.addEventListener(cast.framework.system.EventType.SHUTDOWN, (event) => {
        logEventDetails('CAST_SHUTDOWN', event);
        logWithTimestamp('CAST', '⏹️ Cast session shutdown');
      });
      
      context.addEventListener(cast.framework.system.EventType.STANDBY_CHANGED, (event) => {
        logEventDetails('STANDBY_CHANGED', event);
        logWithTimestamp('CAST', '💤 Standby state changed:', event.isStandby);
      });
      
      context.addEventListener(cast.framework.system.EventType.VISIBILITY_CHANGED, (event) => {
        logEventDetails('VISIBILITY_CHANGED', event);
        logWithTimestamp('CAST', '👁️ Visibility changed:', event.isVisible);
      });

      try {
        // Start the context with detailed options and explicit namespace registration
        const startOptions = {
          customNamespaces: {
            'urn:x-cast:com.todtv.tod.extendsession': 'JSON',
            'urn:x-cast:com.todtv.tod': 'JSON',
            'urn:x-cast:com.todtv': 'JSON',
            'urn:x-cast:com.tod': 'JSON'
          },
          statusText: 'Ready to receive cast content',
          maxInactivity: 60000,  // Longer timeout for debugging
          disableIdleTimeout: true  // Prevent timing out during debugging
        };
        logWithTimestamp('CAST', 'Starting Cast Receiver Context with options:', startOptions);
        context.start(startOptions);
        logWithTimestamp('CAST', '✅ Cast Receiver Context started successfully');
        logWithTimestamp('CAST', 'Is system ready:', context.isSystemReady);
        logWithTimestamp('CAST', 'Device capabilities:', context.getDeviceCapabilities());

        const playerManager = context.getPlayerManager();
        logWithTimestamp('CAST', 'Player manager obtained:', !!playerManager);

        // Add comprehensive player manager event listeners
        playerManager.addEventListener(
          cast.framework.events.EventType.PLAYING,
          (event) => {
            logEventDetails('PLAYER_PLAYING', event);
            logWithTimestamp('PLAYER', '▶️ Video playback started');
            setIsPlaying(true);
          }
        );

        playerManager.addEventListener(
          cast.framework.events.EventType.IDLE,
          (event) => {
            logEventDetails('PLAYER_IDLE', event);
            logWithTimestamp('PLAYER', '⏸️ Video playback stopped or no media loaded');
            logWithTimestamp('PLAYER', 'Idle reason:', event?.idleReason);
            setIsPlaying(false);
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.PAUSE,
          (event) => {
            logEventDetails('PLAYER_PAUSE', event);
            logWithTimestamp('PLAYER', '⏸️ Video paused');
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.BUFFERING,
          (event) => {
            logEventDetails('PLAYER_BUFFERING', event);
            logWithTimestamp('PLAYER', '🔄 Video buffering:', event?.isBuffering);
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.ERROR,
          (event) => {
            logEventDetails('PLAYER_ERROR', event);
            logWithTimestamp('ERROR', '🔴 Player error:', event?.detailedErrorCode);
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.MEDIA_STATUS,
          (event) => {
            logWithTimestamp('PLAYER', '📊 Media status update:', {
              playerState: event?.mediaStatus?.playerState,
              currentTime: event?.mediaStatus?.currentTime,
              duration: event?.mediaStatus?.media?.duration
            });
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.REQUEST_SEEK,
          (event) => {
            logEventDetails('PLAYER_REQUEST_SEEK', event);
            logWithTimestamp('PLAYER', '⏩ Seek requested to:', event?.requestData?.currentTime);
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.REQUEST_LOAD,
          (event) => {
            logEventDetails('PLAYER_REQUEST_LOAD', event);
            logWithTimestamp('PLAYER', '📥 Load requested');
            if (event?.requestData?.media) {
              logMobileData('LOAD_REQUEST_MEDIA', event.requestData.media);
            }
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.REQUEST_STOP,
          (event) => {
            logEventDetails('PLAYER_REQUEST_STOP', event);
            logWithTimestamp('PLAYER', '⏹️ Stop requested');
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.REQUEST_PAUSE,
          (event) => {
            logEventDetails('PLAYER_REQUEST_PAUSE', event);
            logWithTimestamp('PLAYER', '⏸️ Pause requested');
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.REQUEST_PLAY,
          (event) => {
            logEventDetails('PLAYER_REQUEST_PLAY', event);
            logWithTimestamp('PLAYER', '▶️ Play requested');
          }
        );
        
        playerManager.addEventListener(
          cast.framework.events.EventType.REQUEST_VOLUME_CHANGE,
          (event) => {
            logEventDetails('PLAYER_REQUEST_VOLUME_CHANGE', event);
            logWithTimestamp('PLAYER', '🔊 Volume change requested:', event?.requestData?.volume);
          }
        );
        
      } catch (error) {
        logWithTimestamp('ERROR', 'Error starting Cast Receiver Context:', error);
        logWithTimestamp('ERROR', 'Error stack:', error.stack);
      }
    } else {
      if (typeof cast === 'undefined') {
        logWithTimestamp('ERROR', '❌ Cast is undefined - SDK not loaded');
      } else if (!cast.framework) {
        logWithTimestamp('ERROR', '❌ Cast framework is not available');
      } 
    }
    
    // Return cleanup function
    return () => {
      logWithTimestamp('CAST', '🧹 Component unmounting, cleanup...');
      // Additional cleanup if needed
    };
  }, []);
  
  return (
    <div>
      <Player userData={userData} />
    </div>
  );
};

export default App;