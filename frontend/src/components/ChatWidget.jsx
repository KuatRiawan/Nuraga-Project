import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../store/AuthContext';
import { MessageCircle, X, Send, User as UserIcon } from 'lucide-react';
import api from '../api/axios';

const ChatWidget = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeUsers, setActiveUsers] = useState([]);

    // Mentions state
    const [allUsers, setAllUsers] = useState([]);
    const [mentionSearch, setMentionSearch] = useState(null); // null means not searching
    const [cursorPosition, setCursorPosition] = useState(0);
    const [firstUnreadId, setFirstUnreadId] = useState(null);

    const messagesEndRef = useRef(null);
    const unreadMarkerRef = useRef(null);
    const inputRef = useRef(null);
    const widgetRef = useRef(null);
    const justOpenedRef = useRef(false);

    // Fetch initial history and users list
    useEffect(() => {
        if (isOpen) {
            justOpenedRef.current = true;
        }
        if (isOpen && messages.length === 0) {
            setLoading(true);
            api.get('/chat/global')
                .then(res => {
                    const fetchedMessages = res.data;
                    const lastReadStr = localStorage.getItem('nuraga_last_read_chat');

                    if (lastReadStr && fetchedMessages.length > 0) {
                        const lastReadId = parseInt(lastReadStr, 10);
                        const unreadMsg = fetchedMessages.find(m => m.id_message > lastReadId);
                        if (unreadMsg) {
                            setFirstUnreadId(unreadMsg.id_message);
                        }
                    }
                    setMessages(fetchedMessages);
                })
                .catch(err => console.error('Failed to load chat history', err))
                .finally(() => setLoading(false));

            api.get('/users')
                .then(res => setAllUsers(res.data))
                .catch(err => console.error('Failed to load users for mention', err));
        }

        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, [isOpen]);

    // Setup socket listeners
    useEffect(() => {
        if (!socket || !user) return;

        socket.emit('join_global_chat');

        const playPopSound = () => {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);

                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.15);

                setTimeout(() => {
                    audioCtx.close();
                }, 200);
            } catch (e) {
                console.warn('Audio play failed', e);
            }
        };

        const handleReceive = (msg) => {
            setMessages(prev => [...prev, msg]);
            if (!isOpen) {
                setUnreadCount(prev => prev + 1);
            }

            // Trigger Browser Notification if not from me, and tab is hidden or chat closed
            if (msg.id_user !== user.id) {
                playPopSound();
                if ('Notification' in window && Notification.permission === 'granted') {
                    if (document.hidden || !isOpen) {
                        new Notification('Nuraga Safety Chat', {
                            body: `${msg.User?.nama || 'Someone'}: ${msg.pesan}`,
                            icon: '/favicon.ico' // Or any app icon
                        });
                    }
                }
            }
        };

        const handleActiveUsersUpdate = (users) => {
            // Deduplicate users by id_user
            const uniqueMap = new Map();
            users.forEach(u => {
                if (!uniqueMap.has(u.id_user)) {
                    uniqueMap.set(u.id_user, u);
                }
            });
            setActiveUsers(Array.from(uniqueMap.values()));
        };

        socket.on('receive_global_message', handleReceive);
        socket.on('active_users_update', handleActiveUsersUpdate);

        return () => {
            socket.off('receive_global_message', handleReceive);
            socket.off('active_users_update', handleActiveUsersUpdate);
        };
    }, [socket, user, isOpen]);

    // Auto-scroll logic
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);

            // If we just opened and have a first unread, scroll to it instantly
            if (firstUnreadId && unreadMarkerRef.current && justOpenedRef.current) {
                unreadMarkerRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
                justOpenedRef.current = false;
            } else if (messagesEndRef.current) {
                // Use 'auto' if just opened to avoid long scrolling, 'smooth' for new messages
                const scrollBehavior = justOpenedRef.current ? 'auto' : 'smooth';
                messagesEndRef.current.scrollIntoView({ behavior: scrollBehavior });
                justOpenedRef.current = false;
            }
        }
    }, [messages, isOpen, firstUnreadId]);

    // Close on click outside and save last read
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (widgetRef.current && !widgetRef.current.contains(event.target) && document.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (!isOpen && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            localStorage.setItem('nuraga_last_read_chat', lastMsg.id_message);
            setFirstUnreadId(null);
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !socket) return;
        socket.emit('send_global_message', { pesan: input.trim() });
        setInput('');
        setMentionSearch(null);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        setInput(val);
        setCursorPosition(cursorPos);

        // Detect mention typing
        const textBeforeCursor = val.substring(0, cursorPos);
        const words = textBeforeCursor.split(' ');
        const lastWord = words[words.length - 1];

        if (lastWord.startsWith('@')) {
            setMentionSearch(lastWord.substring(1).toLowerCase());
        } else {
            setMentionSearch(null);
        }
    };

    const handleMentionSelect = (username) => {
        const textBeforeCursor = input.substring(0, cursorPosition);
        const textAfterCursor = input.substring(cursorPosition);

        const words = textBeforeCursor.split(' ');
        words.pop(); // Remove the typed @search

        const newTextBefore = words.length > 0 ? words.join(' ') + ` @${username} ` : `@${username} `;

        setInput(newTextBefore + textAfterCursor);
        setMentionSearch(null);
        inputRef.current?.focus();
    };

    const renderMessageContent = (text, isMe) => {
        if (!text) return null;
        const words = text.split(' ');
        return words.map((word, i) => {
            if (word.startsWith('@')) {
                const isMentioningMe = word.toLowerCase() === `@${user.nama.toLowerCase().replace(/\s+/g, '')}`;
                return (
                    <span key={i} className={`font-bold px-1 rounded-sm ${isMentioningMe ? 'bg-yellow-300 text-yellow-900' : (isMe ? 'text-blue-200' : 'text-blue-600')}`}>
                        {word}{' '}
                    </span>
                );
            }
            return word + ' ';
        });
    };

    if (!user) return null;

    return (
        <div ref={widgetRef} className="z-[100]">
            {isOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:bottom-28 sm:right-6 w-full h-[100dvh] sm:w-96 sm:h-[30rem] bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-800 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in sm:slide-in-from-bottom-5 duration-300 z-[100]">
                    {/* Header */}
                    <div className="bg-blue-600 dark:bg-blue-700 p-4 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="bg-white/20 p-2 rounded-xl shrink-0">
                                <MessageCircle size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-sm truncate">Safety Coordination</h3>
                                <div className="flex items-center justify-between mt-0.5 pr-2">
                                    <div className="flex items-center gap-1.5 truncate mr-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0"></span>
                                        <span className="text-blue-100 text-[10px] font-medium tracking-wide uppercase truncate">
                                            <span className="hidden sm:inline">Live Global Chat • </span>
                                            <span className="sm:hidden">Live • </span>
                                            {activeUsers.length} Online
                                        </span>
                                    </div>
                                    <div className="flex -space-x-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                        {activeUsers.slice(0, 3).map(u => (
                                            <div key={u.id_user} title={u.nama} className="w-4 h-4 rounded-full bg-blue-500 border border-blue-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                                                {u.nama.charAt(0)}
                                            </div>
                                        ))}
                                        {activeUsers.length > 3 && (
                                            <div title={`${activeUsers.length - 3} lainnya`} className="w-4 h-4 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[7px] text-slate-700 font-bold shrink-0">
                                                +{activeUsers.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-2 shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 space-y-4 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.id_user === user.id;
                                const isSystem = !msg.User; // Safety check
                                const isFirstUnread = msg.id_message === firstUnreadId;

                                return (
                                    <React.Fragment key={msg.id_message || i}>
                                        {isFirstUnread && (
                                            <div ref={unreadMarkerRef} className="flex items-center justify-center my-4 opacity-70">
                                                <div className="h-px bg-red-400 flex-1"></div>
                                                <span className="px-3 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 rounded-full py-1">
                                                    Pesan Belum Terbaca
                                                </span>
                                                <div className="h-px bg-red-400 flex-1"></div>
                                            </div>
                                        )}
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                                                    <UserIcon size={12} className="text-slate-500" />
                                                </div>
                                                <div>
                                                    {!isMe && (
                                                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                                {msg.User?.nama || 'Unknown'}
                                                            </span>
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                                {msg.User?.role || 'Guest'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${isMe
                                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm rounded-bl-sm'
                                                        }`}>
                                                        {renderMessageContent(msg.pesan, isMe)}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] text-slate-400 font-medium mt-1 ${isMe ? 'mr-9' : 'ml-9'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 relative">

                        {/* Mention Dropdown */}
                        {mentionSearch !== null && (
                            <div className="absolute bottom-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-t-xl max-h-40 overflow-y-auto z-20">
                                {allUsers
                                    .filter(u => u.nama.toLowerCase().replace(/\\s+/g, '').includes(mentionSearch))
                                    .slice(0, 5)
                                    .map(u => {
                                        const username = u.nama.replace(/\\s+/g, '');
                                        return (
                                            <button
                                                key={u.id_user}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent input blur
                                                    handleMentionSelect(username);
                                                }}
                                                onTouchStart={(e) => {
                                                    e.preventDefault(); // Prevent input blur on mobile
                                                    handleMentionSelect(username);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                                                    <UserIcon size={10} />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{u.nama}</span>
                                                <span className="text-xs text-slate-500">@{username}</span>
                                            </button>
                                        );
                                    })}
                            </div>
                        )}

                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ketik pesan darurat/koordinasi..."
                                className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-shadow"
                            />
                            <button
                                type="submit"
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="absolute right-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                            >
                                <Send size={16} className="ml-0.5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 items-center justify-center border-4 border-white dark:border-slate-900 hover:scale-105 active:scale-95 z-[90] ${isOpen ? 'hidden sm:flex bg-slate-800 dark:bg-slate-700 text-white' : 'flex bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                    }`}
            >
                {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-bounce">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
