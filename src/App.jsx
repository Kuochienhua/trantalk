import { useState, useEffect, useRef } from 'react'

// Language Constants
const LANGUAGES = [
  { code: 'zh-TW', name: 'Chinese (Traditional)', flow: 'left' },
  { code: 'en-US', name: 'English', flow: 'ltr' },
  { code: 'ja-JP', name: 'Japanese', flow: 'ltr' }
]

// Icons
const Icons = {
  Mic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
  ),
  MicOff: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
  ),
  Exchange: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/></svg>
  ),
  Bot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
  ),
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  )
}

function App() {
  const [sourceLang, setSourceLang] = useState('zh-TW')
  const [targetLang, setTargetLang] = useState('en-US')
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: '你好！我是你的語言學習助手。請開始對話。', lang: 'zh-TW' }
  ])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Simple Translation API (Using MyMemory free tier for demo)
  const translateText = async (text, from, to) => {
    try {
      if (!text) return ""
      // MyMemory API requires pairs like 'en|it'
      // Mapping strict codes to simpler ones if needed, but zh-TW and ja-JP are supported usually.
      // Need to handle zh-TW specifically if needed, but MyMemory handles standard ISO.
      const pair = `${from}|${to}`
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`)
      const data = await response.json()
      if (data.responseStatus === 200) {
        return data.responseData.translatedText
      } else {
         // Fallback or error
         console.warn("Translation API limit or error", data)
         return text // Return original if failed
      }
    } catch (error) {
      console.error("Translation error", error)
      return text
    }
  }

  // TTS
  const speak = (text, lang) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      
      const voices = window.speechSynthesis.getVoices()
      // Try to match exact, then prefix
      let voice = voices.find(v => v.lang === lang)
      if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]))
      
      if (voice) utterance.voice = voice

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      window.speechSynthesis.speak(utterance)
    }
  }

  // STT
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false)
      window.recognition?.stop()
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = sourceLang
        recognition.continuous = false
        recognition.interimResults = false
        
        window.recognition = recognition

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript
          setInputText(transcript)
          handleSend(transcript)
        }
        
        recognition.start()
      } else {
        alert("Browser does not support Speech Recognition. Please use Chrome/Edge.")
      }
    }
  }

  const handleSend = async (manualText) => {
    const textToSend = manualText || inputText
    if (!textToSend.trim()) return
    
    // Add User Message
    const newUserMsg = { id: Date.now(), sender: 'user', text: textToSend, lang: sourceLang }
    setMessages(prev => [...prev, newUserMsg])
    setInputText('')

    // --- Bot Logic ---
    // 1. Translate User Input to Target (So the bot 'understands' and replies in target language context, 
    //    or simply we translate the interaction)
    
    // The user wants: "I ask, bot answers in the OTHER language".
    // Scenario 1: User says "Hello" (EN). Bot answers "Konnichiwa" (JP)?? No, that's translation.
    // Scenario 2: User says "Hello" (EN). Bot answers "Genki desu ka?" (JP) (Meaningful conversation).
    
    // Since I don't have a Chat LLM, I will simulate a "Translate + Echo/Response" behavior.
    // "I heard: [translated text]" is the safest demo.
    // Let's try to make it slightly chatty using a template.
    
    const translatedInput = await translateText(textToSend, sourceLang, targetLang)
    
    // Simulated Responses in Target Language
    // We need to translate the *Templates* to the target language to be authentic.
    // Or we can just reply with the translated input as a "Translation App" mode 
    // BUT the prompt says "Robot automatic answer... daily conversation".
    // I'll try to generate a generic response in English then translate it to Target.
    
    const genericResponses = [
        "That is very interesting.",
        "I understand, please tell me more.",
        "Could you explain that in detail?",
        "I am learning this language too.",
        "That's a good point.",
        "Really?",
        "Nice to meet you."
    ]
    const randomTemplate = genericResponses[Math.floor(Math.random() * genericResponses.length)]
    
    // Translate the template to target language
    // Note: If target is English, we don't need to translate.
    let botReply = randomTemplate
    if (!targetLang.startsWith('en')) {
         botReply = await translateText(randomTemplate, 'en-US', targetLang)
    }

    // Combine: "Replying to: [Translated Input]. [Bot Reply]"
    // Actually, let's just send the Bot Reply to keep it conversational.
    // Or maybe just the translated input if it's a translation tool? 
    // "Develop an app that translates... I ask, robot answers in other language". 
    // It's ambiguous if it's a Translator or a Chatbot. "Daily conversation" implies Chatbot.
    // I'll stick to the "Chatbot" simulation.
    
    // Logic: Bot echoes the translated text + a conversational filler.
    // Example: User: "Hello", Bot (JP): "Konbanwa. (Hello)"
    
    // If translation fails (returns same text), we might look silly, but it's a demo.
    
    const newBotMsg = { 
        id: Date.now() + 1, 
        sender: 'bot', 
        text: `${translatedInput}? ${botReply}`, // Echoing as a question + reply
        lang: targetLang 
    }
    
    setMessages(prev => [...prev, newBotMsg])
    
    // Speak
    speak(newBotMsg.text, targetLang)
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header glass-panel" style={{position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '1000px', height: 'auto', justifyContent: 'center', gap: '2rem'}}>
        <div style={{display:'flex', alignItems:'center', gap:'1rem', flexWrap: 'wrap', justifyContent:'center'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <span style={{color:'var(--color-text-muted)', fontSize:'0.9rem'}}>YOU SPEAK</span>
            <select 
                value={sourceLang} 
                onChange={(e) => setSourceLang(e.target.value)}
                className="btn"
                style={{background:'rgba(255,255,255,0.1)', padding: '0.5rem 1rem'}}
            >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          
          <button 
            className="btn btn-icon" 
            onClick={() => {
              setSourceLang(targetLang)
              setTargetLang(sourceLang)
            }}
            title="Swap Languages"
            style={{width: '40px', height: '40px', borderRadius: '50%', padding: 0}}
          >
             <Icons.Exchange />
          </button>

          <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <span style={{color:'var(--color-text-muted)', fontSize:'0.9rem'}}>BOT REPLIES</span>
            <select 
                value={targetLang} 
                onChange={(e) => setTargetLang(e.target.value)}
                className="btn"
                style={{background:'rgba(255,255,255,0.1)', padding: '0.5rem 1rem'}}
            >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="split-view" style={{marginTop: '100px'}}>
        
        {/* Left: User Panel */}
        <div className="panel glass-panel">
           <div className="panel-header">
              <div className="panel-title">
                <Icons.User />
                You ({LANGUAGES.find(l=>l.code===sourceLang)?.name})
              </div>
           </div>
           
           <div className="chat-area">
             {messages.filter(m => m.sender === 'user').map(msg => (
               <div key={msg.id} className="message user">
                 {msg.text}
               </div>
             ))}
             <div ref={messagesEndRef} />
           </div>

           <div className="controls">
             <button 
                className={`btn btn-icon ${isListening ? 'listening' : ''}`} 
                onClick={toggleListening}
                style={{
                    background: isListening ? '#ef4444' : undefined,
                    animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
             >
               {isListening ? <Icons.MicOff /> : <Icons.Mic />}
             </button>
             <input 
               className="input-field" 
               placeholder="Type or speak..." 
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button className="btn btn-icon" onClick={() => handleSend()}>
               <Icons.Send />
             </button>
           </div>
        </div>

        {/* Right: Bot Panel */}
        <div className="panel glass-panel" style={{background: 'rgba(20, 30, 50, 0.8)'}}>
           <div className="panel-header">
              <div className="panel-title">
                <Icons.Bot />
                Bot ({LANGUAGES.find(l=>l.code===targetLang)?.name})
              </div>
              {isSpeaking && <div className="typing-indicator"><span></span><span></span><span></span></div>}
           </div>

           <div className="chat-area">
             {messages.filter(m => m.sender === 'bot').map(msg => (
               <div key={msg.id} className="message bot" onClick={() => speak(msg.text, msg.lang)} style={{cursor: 'pointer'}}>
                 <div style={{fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px'}}>Click to Replay</div>
                 {msg.text}
               </div>
             ))}
           </div>
        </div>

      </div>
      
      <style>{`
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  )
}

export default App
