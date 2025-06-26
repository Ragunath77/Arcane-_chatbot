function App() {
    try {
        const [messages, setMessages] = React.useState([]);
        const [isLoading, setIsLoading] = React.useState(false);

        React.useEffect(() => {
            lucide.createIcons();
        }, []);

        const handleSendMessage = async (userMessage) => {
            try {
                const newUserMessage = { role: 'user', content: userMessage };
                setMessages(prev => [...prev, newUserMessage]);
                setIsLoading(true);

                const response = await chatAgent(userMessage, messages);
                
                const aiMessage = { role: 'ai', content: response };
                setMessages(prev => [...prev, aiMessage]);
            } catch (error) {
                console.error('Error sending message:', error);
                const errorMessage = { 
                    role: 'ai', 
                    content: 'Sorry, I encountered an error. Please try again.' 
                };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="h-screen flex flex-col bg-gray-950">
                <Header />
                <ChatContainer messages={messages} isLoading={isLoading} />
                <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
            </div>
        );
    } catch (error) {
        console.error('App component error:', error);
        reportError(error);
    }
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
