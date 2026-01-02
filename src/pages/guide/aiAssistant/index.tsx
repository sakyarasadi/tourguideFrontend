import React, { useState, useRef, useEffect } from 'react';
import GuideSideNav from '../../components/SideNavguide';
import TopNav from '../../components/TopNav';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useRouter } from 'next/router';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date | any;
}

export default function GuideAIAssistant() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Get userId from localStorage
    const storedUserId = localStorage.getItem('userUid');
    if (storedUserId) {
      setUserId(storedUserId);
      loadChatHistory(storedUserId);
    } else {
      // Redirect to login if no userId
      router.push('/');
    }

    // Initialize Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsRecording(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }

      // Initialize Speech Synthesis
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [router]);

  const loadChatHistory = async (uid: string) => {
    try {
      setIsLoading(true);
      const chatsRef = collection(db, 'aiChats');
      
      // Try with composite query first
      try {
        const q = query(
          chatsRef,
          where('userId', '==', uid),
          where('userRole', '==', 'guide'),
          orderBy('timestamp', 'asc')
        );
        
        const snapshot = await getDocs(q);
        const loadedMessages: Message[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedMessages.push({
            id: doc.id,
            type: data.type,
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });

        if (loadedMessages.length === 0) {
          // Add welcome message
          const welcomeMsg: Message = {
            id: '1',
            type: 'ai',
            content: "Hello! I'm your AI guide assistant. How can I help you today? You can ask me about tour requests, applications, pricing strategies, or any guidance you need!",
            timestamp: new Date()
          };
          setMessages([welcomeMsg]);
        } else {
          setMessages(loadedMessages);
        }
      } catch (indexError: any) {
        // If index error, fallback to simpler query
        if (indexError.code === 'failed-precondition') {
          console.warn('Composite index not created. Using fallback query.');
          const q = query(
            chatsRef,
            where('userId', '==', uid),
            where('userRole', '==', 'guide')
          );
          
          const snapshot = await getDocs(q);
          const loadedMessages: Message[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedMessages.push({
              id: doc.id,
              type: data.type,
              content: data.content,
              timestamp: data.timestamp?.toDate() || new Date(),
            });
          });

          // Sort manually since we can't use orderBy
          loadedMessages.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
            return timeA - timeB;
          });

          if (loadedMessages.length === 0) {
            const welcomeMsg: Message = {
              id: '1',
              type: 'ai',
              content: "Hello! I'm your AI guide assistant. How can I help you today? You can ask me about tour requests, applications, pricing strategies, or any guidance you need!",
              timestamp: new Date()
            };
            setMessages([welcomeMsg]);
          } else {
            setMessages(loadedMessages);
          }
        } else {
          throw indexError;
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Show welcome message on error
      const welcomeMsg: Message = {
        id: '1',
        type: 'ai',
        content: "Hello! I'm your AI guide assistant. How can I help you today?",
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatMessage = async (message: Message) => {
    if (!userId) return;

    try {
      const chatsRef = collection(db, 'aiChats');
      await addDoc(chatsRef, {
        userId,
        userRole: 'guide',
        type: message.type,
        content: message.content,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !synthRef.current) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const formatTourRequests = (requests: any[]): string => {
    if (!requests || requests.length === 0) {
      return 'No tour requests found.';
    }

    let formatted = `📋 Found ${requests.length} tour request${requests.length > 1 ? 's' : ''}:\n\n`;
    
    requests.forEach((request, index) => {
      formatted += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      formatted += `📍 ${request.title || 'Untitled Tour'}\n`;
      formatted += `   Destination: ${request.destination || 'N/A'}\n`;
      formatted += `   Type: ${request.tourType || 'N/A'}\n\n`;
      
      if (request.startDate && request.endDate) {
        formatted += `📅 Dates: ${request.startDate} to ${request.endDate}\n`;
      }
      
      formatted += `💰 Budget: $${request.budget?.toLocaleString() || 'N/A'}\n`;
      formatted += `👥 People: ${request.numberOfPeople || 'N/A'}\n`;
      
      if (request.languages && request.languages.length > 0) {
        formatted += `🗣️ Languages: ${request.languages.join(', ')}\n`;
      }
      
      if (request.requirements) {
        formatted += `♿ Requirements: ${request.requirements}\n`;
      }
      
      if (request.description) {
        const shortDesc = request.description.length > 200 
          ? request.description.substring(0, 200) + '...'
          : request.description;
        formatted += `\n📝 Description:\n${shortDesc}\n`;
      }
      
      formatted += `\n📊 Applications: ${request.applicationCount || 0}\n`;
      formatted += `🆔 Request ID: ${request.id}\n`;
      
      if (index < requests.length - 1) {
        formatted += `\n`;
      }
    });
    
    formatted += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formatted += `💡 Tip: You can apply to any of these requests by mentioning the tour title or ID.`;
    
    return formatted;
  };

  const handleSendMessage = async (message?: string) => {
    const messageContent = message || inputMessage.trim();
    if (!messageContent || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Save user message to Firestore
    await saveChatMessage(userMessage);

    try {
      // Send to backend smart router
      const response = await fetch('http://localhost:5000/api/smart-router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageContent,
          userid: userId,
          userRole: 'guide'
        }),
      });

      const data = await response.json();
      console.log('data', data);
      
      let aiContent = '';
      if (data.success) {
        // Check if response contains tour requests array
        if (Array.isArray(data.data) && data.data.length > 0) {
          // Check if it looks like tour requests (has title, destination, etc.)
          const firstItem = data.data[0];
          if (firstItem && (firstItem.title || firstItem.destination || firstItem.tourType)) {
            aiContent = formatTourRequests(data.data);
          } else {
            // Regular array, format differently
            aiContent = `Found ${data.data.length} results:\n\n${JSON.stringify(data.data.slice(0, 5), null, 2)}`;
          }
        } else if (data.data?.data && Array.isArray(data.data.data)) {
          // Nested array structure
          const requests = data.data.data;
          if (requests.length > 0 && requests[0] && (requests[0].title || requests[0].destination)) {
            aiContent = formatTourRequests(requests);
          } else {
            aiContent = data.data.response || data.data.message || data.message || 'Request processed successfully.';
          }
        } else if (data.data?.response) {
          aiContent = data.data.response;
        } else if (data.data?.message) {
          aiContent = data.data.message;
        } else if (typeof data.data === 'string') {
          aiContent = data.data;
        } else if (data.data && typeof data.data === 'object') {
          // Check if it's a paginated response with data array
          if (Array.isArray(data.data.data) && data.data.data.length > 0) {
            const requests = data.data.data;
            if (requests[0] && (requests[0].title || requests[0].destination)) {
              aiContent = formatTourRequests(requests);
            } else {
              aiContent = data.message || JSON.stringify(data.data, null, 2);
            }
          } else {
            aiContent = data.message || JSON.stringify(data.data, null, 2);
          }
        } else {
          aiContent = data.message || 'Request processed successfully.';
        }
      } else {
        aiContent = data.message || data.error || 'Sorry, I encountered an error processing your request.';
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      // Save AI response to Firestore
      await saveChatMessage(aiResponse);

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(aiContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error connecting to the server. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const quickReplies = [
    { text: 'Browse tour requests', action: () => handleSendMessage('Show me all available tour requests') },
    { text: 'My applications', action: () => handleSendMessage('Show my applications') },
    { text: 'Pricing advice', action: () => handleSendMessage('Give me pricing advice for tour proposals') }
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <GuideSideNav />

      <main className="flex-1 overflow-y-auto lg:ml-64">
        <TopNav
          title="AI Assistant"
          onMenuClick={() => {}}
          showSearch={false}
        />

        <div className="flex flex-col h-full">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">AI Guide Assistant</h1>
                  <p className="text-sm text-gray-500">Your intelligent guide companion</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setVoiceEnabled(!voiceEnabled);
                      if (!voiceEnabled) {
                        stopSpeaking();
                      }
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      voiceEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}
                    title={voiceEnabled ? 'Voice enabled - Click to disable' : 'Voice disabled - Click to enable'}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {voiceEnabled ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      )}
                    </svg>
                  </button>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    voiceEnabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    🔊 {voiceEnabled ? 'Voice ON' : 'Voice OFF'}
                  </span>
                </div>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                    title="Stop speaking"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user'
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                    }`}>
                    {message.type === 'user' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${message.type === 'user'
                      ? 'bg-green-100 text-black'
                      : 'bg-gray-100 text-black'
                    }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                      {message.timestamp instanceof Date 
                        ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-xs lg:max-w-md">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={reply.action}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-full text-sm font-medium hover:bg-green-100 transition-colors"
                >
                  {reply.text}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`p-3 rounded-full transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
                title={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              <button
                onClick={() => {
                  setVoiceEnabled(!voiceEnabled);
                  if (!voiceEnabled) {
                    stopSpeaking();
                  }
                }}
                className={`p-3 rounded-full transition-all ${
                  voiceEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}
                title={voiceEnabled ? 'Voice output ON - Click to turn OFF' : 'Voice output OFF - Click to turn ON'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {voiceEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  )}
                </svg>
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening..." : "Type your message or use voice..."}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-black placeholder-gray-400"
                  disabled={isRecording}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isRecording}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2 text-center">
              {isRecording ? '🎤 Recording... Speak now' : `AI Assistant • ${voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'} • Text Mode`}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
