import React, { useState, useEffect, useRef } from 'react';
import { Card, CardBody, Button, Input, Spinner } from 'reactstrap';
import { useLocation, Link } from 'react-router-dom';
import config from '../../config';

interface Message {
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

const AIAssistant = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [projectId, setProjectId] = useState<string | null>(null);

    const getStorageKey = () => {
        const rawAuth = sessionStorage.getItem("authUser");
        let userId = "guest";
        if (rawAuth) {
            try {
                const parsed = JSON.parse(rawAuth);
                const user = parsed.user || parsed.data || parsed;
                userId = user.id || "guest";
            } catch (_) {}
        }
        return `luma_chat_history_${userId}_${projectId || 'global'}`;
    };

    // --- PERSISTENCIA DE CONVERSACIÓN ---
    useEffect(() => {
        const key = getStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const isRecent = Date.now() - parsed.timestamp < 30 * 60 * 1000; // 30 minutos
                if (isRecent && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
                    const mappedMessages = parsed.messages.map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp)
                    }));
                    setMessages(mappedMessages);
                    return;
                }
            } catch (e) {
                console.error("Error al cargar historial del chat", e);
            }
        }
        // Mensaje por defecto si no hay historial reciente o expiró
        setMessages([
            {
                sender: 'ai',
                text: '¡Hola! Soy tu asistente de IA de Luma. Puedo ayudarte a gestionar este proyecto. Prueba pidiéndome cosas como:\n\n* *"¿Qué historias de usuario tenemos?"*\n* *"Crea una historia de usuario de 5 SP llamada Registrarse"* \n* *"Crea un sprint llamado Sprint 3"*',
                timestamp: new Date()
            }
        ]);
    }, [projectId]);

    useEffect(() => {
        if (messages.length === 0) return;
        const key = getStorageKey();
        const payload = {
            timestamp: Date.now(),
            messages: messages
        };
        localStorage.setItem(key, JSON.stringify(payload));
    }, [messages, projectId]);

    // --- LÓGICA DE ARRASTRE (DRAG) ---
    const [position, setPosition] = useState({ x: window.innerWidth - 86, y: window.innerHeight - 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragMoved, setDragMoved] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const bubbleStart = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Ajustar posición si cambia el tamaño de la pantalla
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 70),
                y: Math.min(prev.y, window.innerHeight - 70)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragMoved(false);
        dragStart.current = { x: e.clientX, y: e.clientY };
        bubbleStart.current = { x: position.x, y: position.y };
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            
            // Si se mueve más de 5 píxeles, se considera arrastre en lugar de click
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                setDragMoved(true);
            }

            // Mantener dentro de los límites de la pantalla
            const newX = Math.max(10, Math.min(window.innerWidth - 70, bubbleStart.current.x + dx));
            const newY = Math.max(10, Math.min(window.innerHeight - 70, bubbleStart.current.y + dy));

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    useEffect(() => {
        const match = location.pathname.match(/\/projects\/([a-f0-9-]+)/);
        if (match && match[1]) {
            setProjectId(match[1]);
        } else {
            setProjectId(localStorage.getItem("activeProjectId"));
        }
    }, [location]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input;
        setInput("");
        setMessages(prev => [...prev, { sender: 'user', text: userMessage, timestamp: new Date() }]);
        setLoading(true);

        try {
            const rawAuth = sessionStorage.getItem("authUser");
            let token = "";
            if (rawAuth) {
                const parsed = JSON.parse(rawAuth);
                token = parsed.access_token || "";
            }

            const response = await fetch(`${config.api.API_URL}/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMessage,
                    project_id: projectId,
                    history: messages.map(m => ({ sender: m.sender, text: m.text }))
                })
            });

            if (!response.ok) {
                let errorMessage = "Error en la respuesta del servidor de IA";
                try {
                    const errData = await response.json();
                    errorMessage = errData.detail || errData.message || errorMessage;
                } catch (_) {}
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setMessages(prev => [...prev, { sender: 'ai', text: data.response, timestamp: new Date() }]);
            if (data.action_type && data.action_type !== "none") {
                const event = new CustomEvent("projectDataChanged", { detail: { action_type: data.action_type } });
                window.dispatchEvent(event);
            }
        } catch (err: any) {
            console.error("AI Assistant Error:", err);
            setMessages(prev => [...prev, { 
                sender: 'ai', 
                text: `Lo siento, ha ocurrido un error al comunicarme con el servicio de Inteligencia Artificial: ${err.message}. Asegúrate de tener configurada tu clave \`GEMINI_API_KEY\` en el archivo \`.env\` del backend.`, 
                timestamp: new Date() 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const formatMessageText = (text: string) => {
        // Enlaza a historias del tipo [HU-X](/projects/id/stories/storyId) o similar
        // También busca enlaces en formato Markdown [Link text](url)
        return text.split('\n').map((line, index) => {
            let isBullet = false;
            let currentLine = line;
            if (currentLine.trim().startsWith('* ')) {
                isBullet = true;
                currentLine = currentLine.trim().substring(2);
            }

            // Regex para capturar [Texto del enlace](Url/Ruta)
            const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

            // Parse **bold**, *italic* y [markdown links]
            const parseFormatting = (inputStr: string): React.ReactNode[] => {
                const results: React.ReactNode[] = [];
                let lastIdx = 0;
                
                // Expresión combinada que busca **bold**, *italic* o [text](url)
                const combinedRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
                let match;

                while ((match = combinedRegex.exec(inputStr)) !== null) {
                    if (match.index > lastIdx) {
                        results.push(inputStr.substring(lastIdx, match.index));
                    }

                    const fullMatch = match[0];
                    if (fullMatch.startsWith('**')) {
                        results.push(<strong key={match.index}>{match[2]}</strong>);
                    } else if (fullMatch.startsWith('*')) {
                        results.push(<em key={match.index} className="fw-semibold text-primary text-decoration-none">{match[3]}</em>);
                    } else if (fullMatch.startsWith('[')) {
                        const linkText = match[4];
                        const linkUrl = match[5];
                        if (linkUrl.startsWith('/')) {
                            results.push(
                                <Link 
                                    key={match.index} 
                                    to={linkUrl} 
                                    onClick={() => setIsOpen(false)}
                                    className="fw-bold text-decoration-underline text-primary"
                                >
                                    {linkText}
                                </Link>
                            );
                        } else {
                            results.push(
                                <a 
                                    key={match.index} 
                                    href={linkUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="fw-bold text-decoration-underline text-primary"
                                >
                                    {linkText}
                                </a>
                            );
                        }
                    }
                    lastIdx = combinedRegex.lastIndex;
                }

                if (lastIdx < inputStr.length) {
                    results.push(inputStr.substring(lastIdx));
                }

                return results.length > 0 ? results : [inputStr];
            };

            const content = parseFormatting(currentLine);

            if (isBullet) {
                return (
                    <ul key={index} className="mb-1 ps-3">
                        <li>{content}</li>
                    </ul>
                );
            }

            return <p key={index} className="mb-2">{content}</p>;
        });
    };

    // Calcular posición óptima del chat panel relativo al bubble
    const getChatPanelStyle = (): React.CSSProperties => {
        const chatWidth = 380;
        const chatHeight = 500;
        
        let left = position.x - chatWidth + 56;
        let top = position.y - chatHeight - 15;

        // Ajustar si se sale por la izquierda de la pantalla
        if (left < 10) left = 10;
        // Ajustar si se sale por arriba de la pantalla
        if (top < 10) {
            top = position.y + 70; // Mostrar debajo del bubble
        }

        return {
            left: `${left}px`,
            top: `${top}px`,
            width: `${chatWidth}px`,
            height: `${chatHeight}px`,
            zIndex: 9998,
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        };
    };

    return (
        <React.Fragment>
            {/* Floating Bubble Button (Draggable) */}
            <div 
                className="position-fixed d-flex align-items-center justify-content-center shadow-lg"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3548d5 0%, #15a5e3 100%)',
                    color: '#fff',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    zIndex: 9999,
                    transition: isDragging ? 'none' : 'transform 0.2s ease'
                }}
                onMouseDown={handleMouseDown}
                onClick={() => {
                    if (!dragMoved) {
                        setIsOpen(!isOpen);
                    }
                }}
                onMouseEnter={(e) => {
                    if (!isDragging) e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    if (!isDragging) e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                {isOpen ? (
                    <i className="ri-close-line fs-22"></i>
                ) : (
                    <i className="ri-sparkling-fill fs-22"></i>
                )}
            </div>

            {/* Chat Panel */}
            {isOpen && (
                <Card 
                    className="position-fixed border-0 shadow-lg"
                    style={getChatPanelStyle()}
                >
                    {/* Header */}
                    <div 
                        className="p-3 text-white d-flex align-items-center justify-content-between"
                        style={{ background: 'linear-gradient(135deg, #3548d5 0%, #15a5e3 100%)' }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <i className="ri-robot-2-fill fs-18"></i>
                            <div>
                                <h6 className="m-0 text-white fw-semibold fs-14">Asistente de Scrum</h6>
                            </div>
                        </div>
                        <Button 
                            color="link" 
                            className="text-white p-0 opacity-75 hover-opacity-100"
                            onClick={() => setIsOpen(false)}
                        >
                            <i className="ri-subtract-line fs-18"></i>
                        </Button>
                    </div>

                    {/* Messages List */}
                    <div 
                        className="flex-grow-1 p-3 overflow-y-auto bg-light"
                        style={{ height: 'calc(100% - 130px)' }}
                    >
                        {messages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                            >
                                <div 
                                    className={`p-3 rounded-3 fs-13 ${
                                        msg.sender === 'user' 
                                            ? 'bg-primary text-white' 
                                            : 'bg-white text-dark shadow-sm border border-light-subtle'
                                    }`}
                                    style={{ 
                                        maxWidth: '80%', 
                                        borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    {formatMessageText(msg.text)}
                                    <div className={`fs-9 mt-1 ${msg.sender === 'user' ? 'text-white-50 text-end' : 'text-muted'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="d-flex justify-content-start mb-3">
                                <div className="p-3 bg-white border border-light-subtle rounded-3 shadow-sm d-flex align-items-center gap-2">
                                    <Spinner size="sm" color="primary" />
                                    <span className="fs-12 text-muted">Escribiendo...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Footer */}
                    <div className="p-2 border-top bg-white d-flex align-items-center gap-2">
                        <Input 
                            type="text" 
                            placeholder="Escribe tu consulta sobre Scrum..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                            className="border-0 shadow-none bg-light rounded-pill px-3"
                            style={{ height: '40px' }}
                        />
                        <Button 
                            color="primary" 
                            disabled={!input.trim() || loading}
                            onClick={handleSend}
                            className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: '40px', height: '40px', background: '#3548d5', border: 'none', flexShrink: 0 }}
                        >
                            <i className="ri-send-plane-2-line fs-16"></i>
                        </Button>
                    </div>
                </Card>
            )}
        </React.Fragment>
    );
};

export default AIAssistant;
