function ChatInput({ onSendMessage, disabled }) {
    try {
        const [message, setMessage] = React.useState('');

        const handleSubmit = (e) => {
            e.preventDefault();
            if (message.trim() && !disabled) {
                onSendMessage(message.trim());
                setMessage('');
            }
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        };

        return (
            <div data-name="chat-input" data-file="components/ChatInput.js" 
                 className="bg-gray-900 professional-border border-t px-6 py-4">
                <div className="max-w-5xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex space-x-3">
                        <div className="flex-1 relative">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                disabled={disabled}
                                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 resize-none focus-ring professional-border disabled:opacity-50 placeholder-gray-400"
                                rows="1"
                                style={{minHeight: '44px', maxHeight: '120px'}}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!message.trim() || disabled}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-all duration-200 hover-lift shadow-sm"
                        >
                            <i data-lucide="send" className="w-4 h-4"></i>
                        </button>
                    </form>
                </div>
            </div>
        );
    } catch (error) {
        console.error('ChatInput component error:', error);
        reportError(error);
    }
}
